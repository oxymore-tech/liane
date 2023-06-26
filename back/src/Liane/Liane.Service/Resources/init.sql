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

-- main display function
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
                 4096, 64, true)            AS geom,
               array_to_string(lianes, ',') as lianes,
               array_length(lianes, 1)      as count,
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
                                      from (select liane_id, st_length(st_boundingdiagonal(geometry)::geography) as length
                                            from filtered_segments) as s
                                      group by liane_id
                   ),
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

CREATE OR REPLACE
  FUNCTION get_rallying_point_display(after timestamp, z integer, x integer, y integer)
  RETURNS table
          (
            id         varchar,
            label      varchar,
            location   geometry,
            point_type text,
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
    return query (select distinct on (id) rallying_point.id, rallying_point.label, rallying_point.location, 'pickup', rallying_point.type, rallying_point.address, rallying_point.zip_code, rallying_point.city, rallying_point.place_count
                  from rallying_point,
                       (select st_startpoint(geometry) as start
                        from segment
                               inner join liane_waypoint
                                          on segment.from_id = liane_waypoint.from_id and
                                             segment.to_id = liane_waypoint.to_id
                        where eta between after and after + make_interval(hours => 24)) as ls
                  where rallying_point.location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)
                    and st_dwithin(rallying_point.location::geography, start::geography, 200));

  elsif z between 10 and 11 then
    -- select rallying points where a liane starts and passes by
    return query (select rallying_points.id, rallying_points.label, rallying_points.location, case when min(ds) < 200 then 'pickup' else 'suggestion' end, rallying_points.type, rallying_points.address, rallying_points.zip_code, rallying_points.city, rallying_points.place_count
                  from (select *, st_distancesphere(rallying_point.location, st_startpoint(geom)) as ds
                        from rallying_point,
                             (select segment.geometry as geom, st_simplify(segment.geometry, 0.001) as simplified
                              from segment
                                     inner join liane_waypoint
                                                on segment.from_id = liane_waypoint.from_id and
                                                   segment.to_id = liane_waypoint.to_id
                              where liane_waypoint.eta between after and after + make_interval(hours => 24)) as ls
                        where rallying_point.location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)
                          and st_dwithin(rallying_point.location::geography, simplified::geography,
                                         case when z <= 10 then 200 else 500 end)
                          and st_distancesphere(rallying_point.location, st_endpoint(geom)) > 200) as rallying_points
                  group by rallying_points.id, rallying_points.label, rallying_points.location);

  elsif z >= 12 then
    -- select all rallying points
    return query (select rallying_points.id, rallying_points.label, rallying_points.location, case when min(ds) < 200 then 'pickup' when bool_or(d < 500 and d_end > 200) then 'suggestion' else 'active' end, rallying_points.type, rallying_points.address, rallying_points.zip_code, rallying_points.city, rallying_points.place_count

                  from (with filtered_lianes as (select segment.geometry as geom, st_simplify(segment.geometry, 0.001) as simplified
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
                        where rallying_point.location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)) as rallying_points
                  group by rallying_points.id, rallying_points.label, rallying_points.location);
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
               type, address, zip_code, city, place_count
        FROM get_rallying_point_display(after, z, x, y) as clusters) as tile

  WHERE geom IS NOT NULL;

  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE
                    STRICT
                    PARALLEL SAFE;
