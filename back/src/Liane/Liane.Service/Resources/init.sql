/** Create tables **/

CREATE TABLE IF NOT EXISTS segment
(
  from_id  VARCHAR(24),
  to_id    VARCHAR(24),
  geometry geometry(LineString, 4326),
  PRIMARY KEY (from_id, to_id)
);

CREATE TABLE IF NOT EXISTS liane_waypoint
(
  from_id  VARCHAR(24),
  to_id    VARCHAR(24),
  liane_id VARCHAR(24),
  eta      TIMESTAMP,
  PRIMARY KEY (from_id, to_id, liane_id),
  CONSTRAINT liane_waypoints_segments_from_id_to_id_fk
    FOREIGN KEY (from_id, to_id) REFERENCES segment
);

CREATE TABLE IF NOT EXISTS rallying_point
(
  id          varchar(24),
  label       varchar(255)          not null,
  location    geometry(Point, 4326) not null,
  type        varchar(24),
  address     varchar(255),
  zip_code    varchar(24),
  city        varchar(255),
  place_count integer,
  is_active   boolean,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ongoing_trip
(
  id       varchar(24),
  geometry geometry(LineString, 4326),
  PRIMARY KEY (id)
);


-- Add indexes
CREATE INDEX IF NOT EXISTS segment_geometry_index
  ON segment
    USING gist (geometry);

CREATE INDEX IF NOT EXISTS segment_geography_index
  ON segment
    USING gist ((geometry::geography));

CREATE INDEX IF NOT EXISTS rallying_point_location_index
  ON rallying_point
    USING gist (location);

CREATE INDEX IF NOT EXISTS rallying_point_geography_index
  ON rallying_point
    USING gist ((location::geography));

CREATE INDEX IF NOT EXISTS liane_waypoint_eta_index
  ON liane_waypoint (eta);


/** Display liane tiles **/

-- count by eta
CREATE OR REPLACE FUNCTION timestamp_accum(varchar(24), timestamp, integer)
  RETURNS varchar(24) AS
$$
  -- $3 is offset (timezone) in minutes
with hour as (select date_part('hour', $2 - make_interval(mins => $3))::integer h)
select left($1, hour.h) || least(substring($1, hour.h + 1, 1)::integer + 1, 9)::char || substring($1, hour.h + 2)
from hour;

$$ LANGUAGE 'sql' STRICT;

-- eta flag : each character N represents the amount of liane (0 to 9, 9 meaning 9+) for hour N of the day
CREATE OR REPLACE AGGREGATE eta_flag_agg (timestamp, integer)
  (
  sfunc = timestamp_accum,
  stype = varchar(24),
  initcond = '000000000000000000000000'
  );

CREATE OR REPLACE FUNCTION box2d_to_json(box2d)
  RETURNS json AS
$$
select json_build_array(st_xmin($1), st_ymin($1), st_xmax($1), st_ymax($1))

$$ LANGUAGE 'sql' STRICT;

create or replace function liane_display(z integer, x integer, y integer, query_params json) returns bytea
  immutable
  strict
  parallel safe
  language plpgsql
as
$$
DECLARE
  mvt             bytea;
  after           timestamp;
  timezone_offset integer;
  min_length      integer; -- min displayed distance in km
  simplify_factor double precision;
  segments_limit  integer;
  points_cluster_distance double precision;
BEGIN
  SELECT (coalesce((query_params ->> 'offset')::integer, 0)) INTO timezone_offset;
  SELECT (coalesce(to_date(query_params ->> 'day', 'YYYY-MM-DD') + make_interval(mins => timezone_offset), timezone('utc', now())::date))
  INTO after;

  SELECT (case
            when z < 5 then 80
            when z < 7 then 50
            when z < 10 then 10
            else 0 end) * 1000
  INTO min_length;

  SELECT (case
            when z < 5 then 0.03
            when z < 7 then 0.005
            when z < 10 then 0.001
            when z < 13 then 0.0001
            else 0.00005 end)
  INTO simplify_factor;
  select (case when z < 7 then 25 else 1000 end) into segments_limit;


  SELECT (case
            when z < 7 then 40
            when z < 9 then 20
            when z < 10 then 10
            when z < 12 then 5
            else null end
           ) * 1000
  INTO points_cluster_distance;

  with filtered_lianes as (select *
                           from liane_waypoint
                           where eta between after and after + make_interval(hours => 24)),
       joined as (select segment.from_id,
                         segment.to_id,
                         filtered_lianes.liane_id,
                         filtered_lianes.eta,
                         segment.geometry
                  from segment
                         inner join filtered_lianes
                                    on segment.from_id = filtered_lianes.from_id and
                                       segment.to_id = filtered_lianes.to_id),
       longest_lianes as (select liane_id,
                                 sum(length)                                                               as length,
                                 st_simplify(st_linemerge(st_collect(s.geometry order by s.eta)), 0.00005) as geometry,
                                 (array_agg(s.to_id order by s.eta desc))[1]                               as to_id,
                                 (array_agg(s.from_id order by s.eta asc))[1]                               as from_id
                          from (select liane_id,
                                       to_id,
                                       from_id,
                                       st_length(st_boundingdiagonal(geometry)::geography)      as length,
                                       geometry,
                                       eta,
                                       geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4326) as intersects
                                from joined) as s
                          group by liane_id
                          having bool_or(intersects)),
       lianes_parts as (select liane_id,
                               to_id,
                               from_id,
                               st_extent(geometry) as bbox,
                               st_simplify(ST_Intersection(
                                             geometry,
                                             ST_Transform(ST_TileEnvelope(z, x, y, margin := 0.03125), 4326)
                                             )    , simplify_factor)           as geom

                        from longest_lianes
                        where  length > min_length
                        group by liane_id, to_id, from_id, geometry),
       clipped_points as (select id,
                                 label,
                                 location,
                                 type,
                                 address,
                                 zip_code,
                                 city,
                                 place_count
                          from rallying_point
                          where z > 5
                            and location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)),
       suggestion_points as (select clipped_points.*, array_agg(lianes_parts.liane_id) as liane_ids, bool_or(lianes_parts.to_id = clipped_points.id) as is_deposit
                             from lianes_parts
                                    inner join clipped_points on
                                   clipped_points.id != lianes_parts.from_id  and
                                   case
                                     when z > 7 then
                                       st_dwithin(clipped_points.location::geography, lianes_parts.geom::geography,
                                                  500)
                                     else clipped_points.id = lianes_parts.to_id end
                             group by id, label, location, type, address, zip_code, city, place_count),

       -- Create clusters along segments
       -- (1) : subdivide each line in segments of equal length
       -- (2) : join subdivided lines and its suggestion points
       -- (3) : remove duplicated points occurrences then make clusters
       -- (4) : remove clustered points from suggestions
       subdivided as (select liane_id, to_id, geometry as geom, (points_cluster_distance * i / len) as l_start, (points_cluster_distance * (i + 1) / len) as l_end, len, i
                      from (select *, st_length(geometry::geography) as len from longest_lianes where points_cluster_distance is not null and z > 7) as measured
                             cross join lateral (select i from generate_series(0, floor(len / points_cluster_distance)::integer - 1) as t(i)) as iterator),
       subdivided_suggestions as (select *, row_number() over (partition by id) as point_occurence
                                  from (select subdivided.liane_id,
                                               to_id,
                                               geom,
                                               i,
                                               st_lineinterpolatepoint(geom, (l_start + l_end) / 2) as middle,
                                               suggestion_points.*
                                        from subdivided
                                               inner join suggestion_points on subdivided.liane_id = any (suggestion_points.liane_ids)) as x
                                  where st_distancesphere(middle, location) < points_cluster_distance / 2),
       pre_clustered_points as (select st_collect(location) as points,
                                       array_agg(id) as ids,
                                       count(id) as point_count,
                                       geom
                                from subdivided_suggestions
                                where point_occurence = 1 and id != to_id
                                group by geom
                                having count(id) > 1
       ),
       clustered_points as (select st_lineinterpolatepoint(geom, st_linelocatepoint(geom, st_centroid(points))) as location,
                                   st_extent(points) as bbox,
                                   ids,
                                   point_count
                            from pre_clustered_points group by geom, points, ids, point_count),
       solo_points as (select suggestion_points.*
                       from suggestion_points
                              left join (select distinct unnest(ids) as id from clustered_points) as c on suggestion_points.id = c.id
                       where c.id is null),

       other_points as (select id,
                               label,
                               location,
                               type,
                               address,
                               zip_code,
                               city,
                               place_count
                        from clipped_points
                        where z >= 12
                        except
                        select id,
                               label,
                               location,
                               type,
                               address,
                               zip_code,
                               city,
                               place_count
                        from suggestion_points),
       all_points as (
         select id, label, location, type, address, zip_code, city, place_count,
                liane_ids,
                case when is_deposit then 'deposit' else 'suggestion' end as point_type,
                null::integer as point_count,
                null as bbox
         from solo_points
         union
         select  id, label, location, type, address, zip_code, city, place_count,
                 null as liane_ids,
                 'active' as point_type,
                 null::integer as point_count,
                 null as bbox
         from other_points
         union
         select null         as id,
                null         as label,
                location,
                null         as type,
                null         as address,
                null         as zip_code,
                null         as city,
                null         as place_count,
                null         as liane_ids,
                'suggestion' as point_type,
                point_count::integer,
                box2d_to_json(bbox)::text as bbox
         from clustered_points),
       liane_tile as (select ST_AsMVT(x.*, 'liane_display', 4096, 'geom') as tile
                      from (SELECT ST_AsMVTGeom(
                                     st_transform(geom, 3857),
                                     ST_TileEnvelope(z, x, y),
                                     4096, 64, true)  AS geom,
                                   liane_id           as id,
                                   box2d_to_json(bbox)::text as bbox
                            FROM lianes_parts) as x
                      where geom is not null),
       points_tile as (select ST_AsMVT(x.*, 'rallying_point_display', 4096, 'location') as tile
                       from (SELECT ST_AsMVTGeom(
                                      st_transform(location, 3857),
                                      ST_TileEnvelope(z, x, y),
                                      4096, 64, true) AS location,
                                    id,
                                    label,
                                    type,
                                    address,
                                    zip_code,
                                    city,
                                    place_count,
                                    liane_ids         as lianes,
                                    point_type,
                                    point_count,
                                    bbox
                             from all_points) as x
                       where location is not null)
  SELECT INTO mvt points_tile.tile || liane_tile.tile
  from points_tile,
       liane_tile;

  RETURN mvt;
END
$$;



CREATE OR REPLACE
  FUNCTION liane_display_traffic(z integer, x integer, y integer, query_params json)
  RETURNS bytea AS
$$
DECLARE
  mvt             bytea;
  after           timestamp;
  timezone_offset integer;
  min_length      integer; -- min displayed distance in km
  simplify_factor double precision;
  segments_limit  integer;
BEGIN
  SELECT (coalesce((query_params ->> 'offset')::integer, 0)) INTO timezone_offset;
  SELECT (coalesce(to_date(query_params ->> 'day', 'YYYY-MM-DD') + make_interval(mins => timezone_offset), timezone('utc', now())::date))
  INTO after;

  SELECT (case
            when z < 5 then 80
            when z < 7 then 50
            when z < 10 then 10
            else 0 end) * 1000
  INTO min_length;

  SELECT (case
            when z < 5 then 0.03
            when z < 7 then 0.005
            when z < 10 then 0.001
            when z < 13 then 0.0001
            else 0.00005 end)
  INTO simplify_factor;
  select (case when z < 7 then 25 else 1000 end) into segments_limit;

  -- stages for lianes :
  -- (1) : filter lianes by eta
  -- (2) : filter lines intersecting with the tile boundaries
  -- (3) : estimate longest lianes to reduce the amount of features to compute / display at low zoom levels
  -- (4) : only retain lines parts that are inside the tile (+ extent)
  -- (5) : cut lines in segments [A,B]
  -- (6) : group by segment
  -- (7) : merge segments back to line and simplify according to zoom level
  -- Note: (5) and (6) are executed at the end and on a non simplified geometry to preserve routes topologies and avoid gaps

  with filtered_lianes as (select *
                           from liane_waypoint
                           where eta between after and after + make_interval(hours => 24)),
       filtered_segments as (select segment.from_id,
                                    segment.to_id,
                                    filtered_lianes.liane_id,
                                    filtered_lianes.eta,
                                    segment.geometry
                             from segment
                                    inner join filtered_lianes
                                               on segment.from_id = filtered_lianes.from_id and
                                                  segment.to_id = filtered_lianes.to_id
                             where segment.geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4326)),
       longest_lianes as (select liane_id, sum(length) as length
                          from (select liane_id,
                                       st_length(st_boundingdiagonal(geometry)::geography) as length
                                from filtered_segments) as s
                          group by liane_id),
       clipped_links as (select from_id,
                                to_id,
                                filtered_segments.liane_id,
                                eta,
                                ST_Intersection(geometry,
                                                ST_Transform(ST_TileEnvelope(z, x, y, margin := 0.03125), 4326)) as geom
                         from filtered_segments
                                inner join longest_lianes on longest_lianes.liane_id = filtered_segments.liane_id
                         where length > min_length
                         order by length desc
                         limit segments_limit), -- filter and clip segments
       cut_segments as (select liane_id,
                               from_id,
                               to_id,
                               eta,
                               (st_dumpsegments(st_snaptogrid(geom, 0.000001))).geom as g
                        from clipped_links),

       aggregated_segments as (select array_agg(liane_id order by liane_id) as lianes,
                                      eta_flag_agg(eta, timezone_offset)    as eta,
                                      g
                               from cut_segments
                               group by g),
       final_segments as (SELECT st_simplify(st_linemerge(st_collect(g)), simplify_factor
                                   ) as geom,
                                 lianes,
                                 eta
                          from aggregated_segments
                          group by lianes, eta),
       liane_tile as (select ST_AsMVT(x.*, 'liane_display', 4096, 'geom') as tile
                      from (SELECT ST_AsMVTGeom(
                                     st_transform(geom, 3857),
                                     ST_TileEnvelope(z, x, y),
                                     4096, 64, true)            AS geom,
                                   array_to_string(lianes, ',') as lianes,
                                   array_length(lianes, 1)      as count,
                                   eta
                            FROM final_segments) as x
                      where geom is not null)
  SELECT INTO mvt  liane_tile.tile
  from liane_tile;

  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE
                    STRICT
                    PARALLEL SAFE;


CREATE OR REPLACE
  FUNCTION liane_display_filter_test(z integer, x integer, y integer, query_params json)
  RETURNS bytea AS
$$
DECLARE
  mvt                     bytea;
  after                   timestamp;
  timezone_offset         integer;
  min_length              integer; -- min displayed distance in km
  simplify_factor         double precision;
  origin_point_location   text;
  filter_type          text;
  points_cluster_distance double precision;
BEGIN
  SELECT (coalesce((query_params ->> 'offset')::integer, 0)) INTO timezone_offset;
  SELECT (coalesce(to_date(query_params ->> 'day', 'YYYY-MM-DD') + make_interval(mins => timezone_offset), timezone('utc', now())::date))
  INTO after;

  if query_params ->> 'pickup' is not null then
    SELECT location from rallying_point where (query_params ->> 'pickup') = rallying_point.id INTO origin_point_location;
    SELECT 'pickup' into filter_type;
  elsif query_params ->> 'deposit' is not null then
    SELECT location from rallying_point where (query_params ->> 'deposit') = rallying_point.id INTO origin_point_location;
    SELECT 'deposit' into filter_type;
  else
    raise notice 'pickup or deposit point missing';
  end if;


  SELECT (case
            when z < 5 then 80
            when z < 7 then 50
            when z < 10 then 10
            else 0 end) * 1000
  INTO min_length;

  SELECT (case
            when z < 5 then 0.03
            when z < 7 then 0.005
            when z < 10 then 0.001
            when z < 13 then 0.0001
            else 0.00005 end)
  INTO simplify_factor;

  SELECT (case
            when z < 7 then 40
            when z < 9 then 20
            when z < 10 then 10
            when z < 12 then 5
            else null end
           ) * 1000
  INTO points_cluster_distance;

  with filtered_lianes as (select *
                           from liane_waypoint
                           where eta between after and after + make_interval(hours => 24)),
       joined as (select segment.from_id,
                         segment.to_id,
                         filtered_lianes.liane_id,
                         filtered_lianes.eta,
                         segment.geometry
                  from segment
                         inner join filtered_lianes
                                    on segment.from_id = filtered_lianes.from_id and
                                       segment.to_id = filtered_lianes.to_id),
       longest_lianes as (select liane_id,
                                 sum(length)                                                               as length,
                                 st_simplify(st_linemerge(st_collect(s.geometry order by s.eta)), 0.00005) as geometry,
                                 case when filter_type = 'pickup' then (array_agg(s.to_id order by s.eta desc))[1]
                                   else (array_agg(s.from_id order by s.eta asc))[1]  end as extremity_point_id
                          from (select liane_id,
                                       to_id,
                                       from_id,
                                       st_length(st_boundingdiagonal(geometry)::geography)      as length,
                                       geometry,
                                       eta,
                                       geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4326) as intersects
                                from joined) as s
                          group by liane_id
                          having bool_or(intersects)),
       lianes_parts as (select liane_id,
                               extremity_point_id,
                               st_extent(geom) as bbox,
                               ST_Intersection(
                                 geom,
                                 ST_Transform(ST_TileEnvelope(z, x, y, margin := 0.03125), 4326)
                                 )               as geom
                               -- ST_Intersection(geometry,     ST_Transform(ST_TileEnvelope(z, x, y, margin := 0.03125), 4326)) as geom
                        from (select
                                liane_id,
                                extremity_point_id,
                                case when filter_type = 'pickup' then
                                       st_linesubstring(geometry, st_linelocatepoint(geometry, origin_point_location), 1)
                                     else  st_linesubstring(geometry, 0, st_linelocatepoint(geometry, origin_point_location))  end as geom
                              from longest_lianes
                              where st_dwithin(geometry::geography, origin_point_location::geography, 500)
                                and length > min_length) as sub
                        where st_length(geom::geography) > 500
                        group by geom, liane_id, extremity_point_id),
       clipped_points as (select id,
                                 label,
                                 location,
                                 type,
                                 address,
                                 zip_code,
                                 city,
                                 place_count
                          from rallying_point
                          where z > 5
                            and location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)
                            and st_distancesphere(origin_point_location, location) > 200),

       suggestion_points as (select clipped_points.*, array_agg(lianes_parts.liane_id) as liane_ids
                             from lianes_parts
                                    inner join clipped_points on
                               case
                                 when z > 7 then
                                   st_dwithin(clipped_points.location::geography, lianes_parts.geom::geography,
                                              500)
                                 else clipped_points.id = lianes_parts.extremity_point_id end
                             group by id, label, location, type, address, zip_code, city, place_count),

       -- Create clusters along segments
       -- (1) : subdivide each line in segments of equal length
       -- (2) : join subdivided lines and its suggestion points
       -- (3) : remove duplicated points occurrences then make clusters
       -- (4) : remove clustered points from suggestions
       subdivided as (select liane_id, extremity_point_id, geometry as geom, (points_cluster_distance * i / len) as l_start, (points_cluster_distance * (i + 1) / len) as l_end, len, i
                      from (select *, st_length(geometry::geography) as len from longest_lianes where points_cluster_distance is not null and z > 7) as measured
                             cross join lateral (select i from generate_series(0, floor(len / points_cluster_distance)::integer - 1) as t(i)) as iterator),
       subdivided_suggestions as (select *, row_number() over (partition by id) as point_occurence
                                  from (select subdivided.liane_id,
                                               extremity_point_id,
                                               i,
                                               geom,
                                               st_lineinterpolatepoint(geom, (l_start + l_end) / 2) as middle,
                                               suggestion_points.*
                                        from subdivided
                                               inner join suggestion_points on subdivided.liane_id = any (suggestion_points.liane_ids)) as x
                                  where st_distancesphere(middle, location) < points_cluster_distance / 2),
       pre_clustered_points as (select st_collect(location) as points,
                                       array_agg(id) as ids,
                                       count(id) as point_count,
                                       geom
                                from subdivided_suggestions
                                where point_occurence = 1 and id != extremity_point_id
                                group by geom
                                having count(id) > 1
       ),
       clustered_points as (select st_lineinterpolatepoint(geom, st_linelocatepoint(geom, st_centroid(points))) as location,
                                   st_extent(points) as bbox,
                                   ids,
                                   point_count
                            from pre_clustered_points
                            group by geom, point_count, points, ids),
       solo_points as (select suggestion_points.*
                       from suggestion_points
                              left join (select distinct unnest(ids) as id from clustered_points) as c on suggestion_points.id = c.id
                       where c.id is null),

       other_points as (select id,
                               label,
                               location,
                               type,
                               address,
                               zip_code,
                               city,
                               place_count
                        from clipped_points
                        where z >= 12
                        except
                        select id,
                               label,
                               location,
                               type,
                               address,
                               zip_code,
                               city,
                               place_count
                        from suggestion_points),
       all_points as (select *, 'suggestion' as point_type, null::integer as point_count, null as bbox
                      from solo_points
                      union
                      select *, null as liane_ids, 'active' as point_type, null::integer as point_count, null as bbox
                      from other_points
                      union
                      select null         as id,
                             null         as label,
                             location,
                             null         as type,
                             null         as address,
                             null         as zip_code,
                             null         as city,
                             null         as place_count,
                             null         as liane_ids,
                             'suggestion' as point_type,
                             point_count::integer,
                             box2d_to_json(bbox)::text as bbox
                      from clustered_points),
       liane_tile as (select ST_AsMVT(x.*, 'liane_display', 4096, 'geom') as tile
                      from (SELECT ST_AsMVTGeom(
                                     st_transform(geom, 3857),
                                     ST_TileEnvelope(z, x, y),
                                     4096, 64, true)  AS geom,
                                   liane_id           as id,
                                   box2d_to_json(bbox)::text as bbox
                            FROM lianes_parts) as x
                      where geom is not null),
       points_tile as (select ST_AsMVT(x.*, 'rallying_point_display', 4096, 'location') as tile
                       from (SELECT ST_AsMVTGeom(
                                      st_transform(location, 3857),
                                      ST_TileEnvelope(z, x, y),
                                      4096, 64, true) AS location,
                                    id,
                                    label,
                                    type,
                                    address,
                                    zip_code,
                                    city,
                                    place_count,
                                    liane_ids         as lianes,
                                    point_type,
                                    point_count,
                                    bbox
                             from all_points) as x
                       where location is not null)
  SELECT INTO mvt points_tile.tile || liane_tile.tile
  from points_tile,
       liane_tile;

  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE
                    STRICT
                    PARALLEL SAFE;



/** display rallying points **/

-- main display function
CREATE OR REPLACE
  FUNCTION rallying_point_display(z integer, x integer, y integer, query_params json)
  RETURNS bytea AS
$$
DECLARE
  mvt             bytea;
BEGIN

  if z > 5 then
    SELECT INTO mvt ST_AsMVT(tile.*, 'rallying_point_display', 4096, 'geom')
    FROM (SELECT ST_AsMVTGeom(
                   st_transform(location, 3857),
                   ST_TileEnvelope(z, x, y),
                   4096, 64, true) AS geom,
                 id,
                 label,
                 type,
                 address,
                 zip_code,
                 city,
                 place_count,
                 is_active
          FROM rallying_point
          where rallying_point.location @
                ST_Transform(ST_TileEnvelope(z, x, y), 4326)) as tile

    WHERE geom IS NOT NULL;

  end if;
  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE
                    STRICT
                    PARALLEL SAFE;

-- search liane (detour or partial route match)
CREATE OR REPLACE
  FUNCTION match_liane(geom geometry, after timestamp with time zone, before timestamp with time zone)
  RETURNS table
          (
            liane_id text,
            pickup   geometry,
            deposit  geometry,
            l_start  double precision,
            l_end    double precision,
            mode     text
          )
AS
$$
with time_filtered_lianes as (select *
                         from liane_waypoint
                         where eta between after and before),
     filtered_segments as (select st_snaptogrid(segment.geometry, 0.000001) as geometry, from_id, to_id
                           from segment
                           where st_distancesphere(st_envelope(geom), st_envelope(geometry)) <
                                 st_length(st_boundingdiagonal(geometry)::geography)),
     geo_filtered_lianes as (select distinct time_filtered_lianes.liane_id
                             from filtered_segments
                                    inner join time_filtered_lianes
                                               on filtered_segments.from_id = time_filtered_lianes.from_id and
                                                  filtered_segments.to_id = time_filtered_lianes.to_id),
     lianes as (select geo_filtered_lianes.liane_id,
                       ST_LineMerge(st_collect(segment.geometry order by eta)) as geometry,
                       st_removerepeatedpoints(
                         st_union(
                           st_collect(st_startpoint(segment.geometry)),
                           st_collect(st_endpoint(segment.geometry)))
                         )                                                               as waypoints
                from geo_filtered_lianes
                       inner join time_filtered_lianes on geo_filtered_lianes.liane_id = time_filtered_lianes.liane_id
                       inner join segment
                                  on segment.from_id = time_filtered_lianes.from_id and
                                     segment.to_id = time_filtered_lianes.to_id
                group by geo_filtered_lianes.liane_id),
     exact_candidates as (select *,
                                 ST_LineLocatePoint(geometry, st_startpoint(geom)) as l_start,
                                 ST_LineLocatePoint(geometry, st_endpoint(geom))   as l_end
                          from lianes
                          where st_contains(st_buffer(waypoints::geography, 200)::geometry, st_startpoint(geom))
                            and st_contains(st_buffer(waypoints::geography, 200)::geometry, st_endpoint(
                            geom))),
     detour_candidates as (select *,
                                  st_distancesphere(st_startpoint(geom), geometry)  as d_start,
                                  st_distancesphere(st_endpoint(geom), geometry)    as d_end,
                                  ST_LineLocatePoint(geometry, st_startpoint(geom)) as l_start,
                                  ST_LineLocatePoint(geometry, st_endpoint(geom))   as l_end
                           from lianes),
     partial_candidates as (select *,
                                   (ST_Dump(ST_Intersection(geom, geometry))).geom as intersections
                            from lianes
                            where ST_Intersects(geom, geometry)),
     filtered_exact_candidates as (select liane_id,
                                          st_startpoint(geom) as pickup,
                                          st_endpoint(geom)   as deposit,
                                          0                   as l_start,
                                          1                   as l_end,
                                          'exact'             as mode
                                   from exact_candidates
                                   where exact_candidates.l_end > exact_candidates.l_start),
     filtered_detour_candidates as (select liane_id,
                                           st_startpoint(geom) as pickup,
                                           st_endpoint(geom)   as deposit,
                                           l_start,
                                           l_end,
                                           'detour'            as mode
                                    from detour_candidates
                                    where d_start < 5000
                                      and d_end < 5000
                                      and l_end - l_start > 0.2),
     filtered_partial_candidates as (select liane_id,
                                            st_lineinterpolatepoint(geometry, l_start) as pickup,
                                            st_lineinterpolatepoint(geometry, l_end)   as deposit,
                                            l_start,
                                            l_end,
                                            'partial'                                  as mode
                                     from (select liane_id,
                                                  geometry,
                                                  min(least(l_start, l_end))      as l_start,
                                                  max(greatest(l_start, l_end))   as l_end,
                                                  min(least(tl_start, tl_end))    as tl_start,
                                                  max(greatest(tl_start, tl_end)) as tl_end
                                           from (select *,
                                                        st_linelocatepoint(geometry, st_startpoint(intersections)) as l_start,
                                                        st_linelocatepoint(geometry, st_endpoint(intersections))   as l_end, -- will be null if intersection is a point
                                                        st_linelocatepoint(geom, st_endpoint(intersections))       as tl_end,
                                                        st_linelocatepoint(geom, st_startpoint(intersections))     as tl_start

                                                 from partial_candidates) as x
                                           group by liane_id, geometry) as intersections
                                          -- keep matches that cover at least 35% of the target route
                                     where tl_end - tl_start > 0.35),
     candidates as
       (select * from filtered_exact_candidates union all select * from filtered_detour_candidates union all select * from filtered_partial_candidates)

select liane_id, pickup, deposit, l_start, l_end, mode
from candidates

$$ LANGUAGE SQL
  IMMUTABLE
  RETURNS NULL ON NULL INPUT
  PARALLEL SAFE;


CREATE OR REPLACE
  FUNCTION match_liane_by_rallying_points(pickup_location geometry(Point, 4326), deposit_location geometry(Point, 4326), after timestamp with time zone, before timestamp with time zone)
  RETURNS table
          (
            liane_id text,
            pickup   geometry,
            deposit  geometry,
            l_start  double precision,
            l_end    double precision,
            mode     text
          )
AS
$$
with time_filtered_lianes as (select *
                              from liane_waypoint
                              where eta between after and before),
     filtered_segments as (select st_snaptogrid(segment.geometry, 0.000001) as geometry, from_id, to_id
                           from segment
                           where st_distancesphere(geometry, pickup_location) < 500
                              or st_distancesphere(geometry, deposit_location) < 500),
     geo_filtered_lianes as (select distinct time_filtered_lianes.liane_id
                             from filtered_segments
                                    inner join time_filtered_lianes
                                               on filtered_segments.from_id = time_filtered_lianes.from_id and
                                                  filtered_segments.to_id = time_filtered_lianes.to_id),
     lianes as (select geo_filtered_lianes.liane_id,
                       ST_LineMerge(st_collect(segment.geometry order by eta)) as geometry
                from geo_filtered_lianes
                       inner join time_filtered_lianes on geo_filtered_lianes.liane_id = time_filtered_lianes.liane_id
                       inner join segment
                                  on segment.from_id = time_filtered_lianes.from_id and
                                     segment.to_id = time_filtered_lianes.to_id
                group by geo_filtered_lianes.liane_id),
     candidates as (select liane_id, st_linelocatepoint(geometry, pickup_location) as l_start, st_linelocatepoint(geometry, deposit_location) as l_end
                    from lianes
                    where st_linelocatepoint(geometry, pickup_location) < st_linelocatepoint(geometry, deposit_location)
                      and st_distancesphere(geometry, pickup_location) < 500
                      and st_distancesphere(geometry, deposit_location) < 500)
select liane_id, pickup_location as pickup, deposit_location as deposit, l_start, l_end, 'partial' as mode
from candidates;


$$ LANGUAGE SQL
  IMMUTABLE
  RETURNS NULL ON NULL INPUT
  PARALLEL SAFE;
