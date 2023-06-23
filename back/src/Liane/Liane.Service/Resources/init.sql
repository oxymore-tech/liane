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
  PRIMARY KEY (from_id, to_id, liane_id)
);

CREATE TABLE IF NOT EXISTS rallying_point
(
  id varchar(24),
  label varchar(255),
  location geometry(Point, 4326),
  type varchar(24),
  address varchar(255),
  zip_code varchar(24),
  city varchar(255),
  place_count integer,
  is_active boolean,
  PRIMARY KEY (id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS segment_geometry_index
  ON segment
    USING gist (geometry);

CREATE INDEX IF NOT EXISTS segment_geography_index
  ON segment
    USING gist ((geometry::geography));

CREATE INDEX IF NOT EXISTS liane_waypoint_eta_index
  ON liane_waypoint(eta);

-- Display liane tiles
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
            when z < 5 then 100
            when z < 7 then 50
            when z < 10 then 10
            else 0 end) * 1000
  INTO min_length;

  SELECT (case
            when z < 5 then 0.01
            when z < 7 then 0.005
            when z < 10 then 0.001
            when z < 13 then 0.0001
            else 0.00005 end)
  INTO simplify_factor;
  select (case when z < 7 then 25 else 1000 end) into segments_limit;

  SELECT INTO mvt ST_AsMVT(tile.*, 'liane_display', 4096, 'geom')
  FROM (SELECT ST_AsMVTGeom(
                 st_transform(geom, 3857),
                 ST_TileEnvelope(z, x, y),
                 4096, 64, true)      AS geom,
               array_to_string(lianes, ',') as lianes,
               array_length(lianes, 1)      as count
            
        FROM (with filtered_lianes as (select *
                                       from liane_waypoint
                                       where eta between after and after + make_interval(hours => 24)
        ),
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
                                      from (select liane_id, st_length(geometry::geography) as length
                                            from filtered_segments) as s
                                      group by liane_id
                                      order by length),
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
                                                 
                                                  g
                                           from cut_segments
                                           group by g)
              SELECT st_simplify(st_linemerge(st_collect(g)), simplify_factor
                       ) as geom,
                     lianes
              from aggregated_segments
              group by lianes 
             
             ) as joined) as tile
  WHERE geom IS NOT NULL;

  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE
                    STRICT
                    PARALLEL SAFE;