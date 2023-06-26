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
  constraint liane_waypoints_segments_from_id_to_id_fk
    foreign key (from_id, to_id) references segment
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

CREATE OR REPLACE
  FUNCTION liane_display(z integer, x integer, y integer, query_params json)
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
  SELECT (coalesce(to_date(query_params ->> 'day', 'YYYY-MM-DD'), timezone('utc', now())::date) +
          make_interval(mins => timezone_offset))
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

  -- stages :
  -- (1) : filter lianes by eta
  -- (2) : filter lines intersecting with the tile boundaries
  -- (3) : estimate longest lianes to reduce the amount of features to compute / display at low zoom levels
  -- (4) : only retain lines parts that are inside the tile (+ extent)
  -- (5) : cut lines in segments [A,B]
  -- (6) : group by segment
  -- (7) : merge segments back to line and simplify according to zoom level
  -- Note: (5) and (6) are executed at the end and on a non simplified geometry to preserve routes topologies and avoid gaps

  SELECT INTO mvt ST_AsMVT(tile.*, 'liane_display', 4096, 'geom')
  FROM (SELECT ST_AsMVTGeom(
                 st_transform(geom, 3857),
                 ST_TileEnvelope(z, x, y),
                 4096, 64, true)                                                                                           AS geom,
               -- array_to_string(lianes, ',') as lianes,
               array_length(lianes, 1)                                                                                     as count,
               jsonb_object(array(select 'l_' || (unnest(lianes))), array_fill(''::text, array [array_length(lianes, 1)])) as liane_map,
               eta
        FROM (with filtered_lianes as (select *
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
                                           group by g)
              SELECT st_simplify(st_linemerge(st_collect(g)), simplify_factor
                       ) as geom,
                     lianes,
                     eta
              from aggregated_segments
              group by lianes, eta) as joined) as tile
  WHERE geom IS NOT NULL;

  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE
                    STRICT
                    PARALLEL SAFE;


/** display rallying points **/
DROP FUNCTION IF EXISTS get_rallying_point_display;
CREATE FUNCTION get_rallying_point_display(after timestamp, z integer, x integer, y integer)
  RETURNS table
          (
            id          varchar(24),
            label       varchar,
            location    geometry,
            point_type  text,
            liane_map   jsonb,
            type        text,
            address     text,
            zip_code    text,
            city        text,
            place_count integer
          )
AS
$$
BEGIN
  if z between 7 and 9 then
    -- only select rallying points where a liane starts
    return query (select rallying_point.id,
                         rallying_point.label,
                         rallying_point.location,
                         'pickup',
                         jsonb_object(array_agg('l_' || ls.liane_id),
                                      array_fill('pickup'::text, array [count(liane_id)::integer])),
                         rallying_point.type::text,
                         rallying_point.address::text,
                         rallying_point.zip_code::text,
                         rallying_point.city::text,
                         rallying_point.place_count::integer
                  from rallying_point,
                       (select st_startpoint(geometry) as start, liane_waypoint.liane_id
                        from segment
                               inner join liane_waypoint
                                          on segment.from_id = liane_waypoint.from_id and
                                             segment.to_id = liane_waypoint.to_id
                        where eta between after and after + make_interval(hours => 24)) as ls
                  where rallying_point.location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)
                    and st_dwithin(rallying_point.location::geography, start::geography, 200)
                  group by rallying_point.id);

  elsif z between 10 and 11 then
    -- select rallying points where a liane starts and passes by
    return query (select rallying_points.id,
                         rallying_points.label,
                         rallying_points.location,
                         case when min(ds) < 200 then 'pickup' else 'suggestion' end,
                         jsonb_object(array_agg('l_' || rallying_points.liane_id),
                                      array_agg(case when rallying_points.ds < 200 then 'pickup' else 'suggestion' end)),
                         rallying_points.type::text,
                         rallying_points.address::text,
                         rallying_points.zip_code::text,
                         rallying_points.city::text,
                         rallying_points.place_count::integer
                  from (select *, st_distancesphere(rallying_point.location, st_startpoint(geom)) as ds
                        from rallying_point,
                             (select segment.geometry                     as geom,
                                     st_simplify(segment.geometry, 0.001) as simplified,
                                     liane_waypoint.liane_id
                              from segment
                                     inner join liane_waypoint
                                                on segment.from_id = liane_waypoint.from_id and
                                                   segment.to_id = liane_waypoint.to_id
                              where liane_waypoint.eta between after and after + make_interval(hours => 24)) as ls
                        where rallying_point.location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)
                          and st_dwithin(rallying_point.location::geography, simplified::geography,
                                         case when z <= 10 then 200 else 500 end)
                          and st_distancesphere(rallying_point.location, st_endpoint(geom)) > 200) as rallying_points
                  group by rallying_points.id, rallying_points.label, rallying_points.location,
                           rallying_points.type, rallying_points.address, rallying_points.zip_code,
                           rallying_points.city, rallying_points.place_count);

  elsif z >= 12 then
    -- select all rallying points
    return query (select rallying_points.id,
                         rallying_points.label,
                         rallying_points.location,
                         case
                           when min(ds) < 200 then 'pickup'
                           when bool_or(d < 500 and d_end > 200) then 'suggestion'
                           else 'active' end,

                         jsonb_object(
                             array_agg('l_' || rallying_points.liane_id) filter ( where rallying_points.d < 500),
                             array_agg(case
                                         when rallying_points.ds < 200
                                           then 'pickup'
                                         when rallying_points.d < 500 and rallying_points.d_end > 200
                                           then 'suggestion'
                                         else 'active' end) filter ( where rallying_points.d < 500)
                           ),
                         rallying_points.type::text,
                         rallying_points.address::text,
                         rallying_points.zip_code::text,
                         rallying_points.city::text,
                         rallying_points.place_count::integer

                  from (with filtered_lianes as (select segment.geometry                     as geom,
                                                        st_simplify(segment.geometry, 0.001) as simplified,
                                                        liane_waypoint.liane_id
                                                 from segment
                                                        inner join liane_waypoint
                                                                   on segment.from_id = liane_waypoint.from_id and
                                                                      segment.to_id = liane_waypoint.to_id
                                                 where liane_waypoint.eta between after and after + make_interval(hours => 24))
                        select *,
                               st_distancesphere(rallying_point.location, st_startpoint(geom)) as ds,
                               st_distancesphere(rallying_point.location, simplified)          as d,
                               st_distancesphere(rallying_point.location, st_endpoint(geom))   as d_end
                        from rallying_point
                               full join filtered_lianes on true
                        where rallying_point.location @
                              ST_Transform(ST_TileEnvelope(z, x, y), 4326)) as rallying_points
                  group by rallying_points.id, rallying_points.label, rallying_points.location,
                           rallying_points.type, rallying_points.address, rallying_points.zip_code,
                           rallying_points.city, rallying_points.place_count);
  end if;

END
$$ LANGUAGE plpgsql IMMUTABLE
                    STRICT
                    PARALLEL SAFE;


-- main display function
CREATE OR REPLACE
  FUNCTION rallying_point_display(z integer, x integer, y integer, query_params json)
  RETURNS bytea AS
$$
DECLARE
  mvt             bytea;
  after           timestamp;
  timezone_offset integer;
BEGIN
  SELECT (coalesce((query_params ->> 'offset')::integer, 0)) INTO timezone_offset;
  SELECT (coalesce(to_date(query_params ->> 'day', 'YYYY-MM-DD'), timezone('utc', now())::date) +
          make_interval(mins => timezone_offset))
  INTO after;

  SELECT INTO mvt ST_AsMVT(tile.*, 'rallying_point_display', 4096, 'geom')
  FROM (SELECT ST_AsMVTGeom(
                 st_transform(location, 3857),
                 ST_TileEnvelope(z, x, y),
                 4096, 64, true) AS geom,
               id,
               label,
               point_type,
               type,
               address,
               zip_code,
               city,
               place_count,
               liane_map
        FROM get_rallying_point_display(after, z, x, y) as clusters) as tile

  WHERE geom IS NOT NULL;

  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE
                    STRICT
                    PARALLEL SAFE;


-- search liane (detour or partial route match)
DROP FUNCTION IF EXISTS match_liane;
CREATE
  FUNCTION match_liane(geom geometry, after timestamp, before timestamp)
  RETURNS table
          (
            liane_id varchar(24),
            pickup   geometry,
            deposit  geometry,
            l_start  double precision,
            l_end    double precision,
            mode     text
          )
AS
$$
with filtered_lianes as (select *
                         from liane_waypoint
                         where eta between after and before),
     -- eliminate segments that are too far from the requested route
     filtered_segments as (select * from segment where st_distancesphere(st_envelope(geom), st_envelope(geometry)) < st_length(st_boundingdiagonal(geometry)::geography)),
     lianes as (select filtered_lianes.liane_id,
                       ST_LineMerge(st_collect(filtered_segments.geometry)) as geometry
                from filtered_segments
                       inner join filtered_lianes
                                  on filtered_segments.from_id = filtered_lianes.from_id and
                                     filtered_segments.to_id = filtered_lianes.to_id
                group by liane_id),
     detour_candidates as (select *,
                                  st_distancesphere(st_startpoint(geom), geometry)  as d_start,
                                  st_distancesphere(st_endpoint(geom), geometry)    as d_end,
                                  ST_LineLocatePoint(geometry, st_startpoint(geom)) as l_start,
                                  ST_LineLocatePoint(geometry, st_endpoint(geom))   as l_end
                           from lianes),
     partial_candidates as (select *,
                                   (ST_Dump(ST_LineMerge(ST_CollectionExtract(ST_Intersection(geom, geometry), 2)))).geom as intersections
                            from lianes
                            where ST_Intersects(geom, geometry)),
     filtered_detour_candidates as (select liane_id,
                                           st_startpoint(geom) as pickup,
                                           st_endpoint(geom)   as deposit,
                                           l_start,
                                           l_end,
                                           'detour'            as mode
                                    from detour_candidates
                                    where d_start < 5000
                                      and d_end < 5000
                                      and l_end > l_start),
     filtered_partial_candidates as (select liane_id, pickup, deposit, l_start, l_end, 'partial' as mode
                                     from (select *,
                                                  st_startpoint(intersections)                               as pickup,
                                                  st_endpoint(intersections)                                 as deposit,
                                                  st_linelocatepoint(geometry, st_startpoint(intersections)) as l_start,
                                                  st_linelocatepoint(geometry, st_endpoint(intersections))   as l_end
                                           from partial_candidates) as x
                                     where l_end - l_start > 0.4),
     candidates as (select * from filtered_detour_candidates union all select * from filtered_partial_candidates)
select liane_id, pickup, deposit, l_start, l_end, mode
from candidates

$$ LANGUAGE SQL
  IMMUTABLE
  RETURNS NULL ON NULL INPUT
  PARALLEL SAFE;
