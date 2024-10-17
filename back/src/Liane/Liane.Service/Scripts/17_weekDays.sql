DROP FUNCTION IF EXISTS liane_display;

CREATE OR REPLACE FUNCTION liane_display(z integer, x integer, y integer, query_params json) returns bytea
  immutable
  strict
  parallel safe
  language plpgsql
as
$$
DECLARE
  mvt             BYTEA;
  simplify_factor double precision;
  weekDays        VARCHAR(7);
BEGIN

  SELECT (case
            when z < 5 then 0.03
            when z < 7 then 0.005
            when z < 10 then 0.001
            else 0.00000001 end)
  INTO simplify_factor;

  SELECT (coalesce((query_params ->> 'weekDays')::varchar, '1111111')) INTO weekDays;

  WITH relevant_routes AS (SELECT array_agg(lr.id)                       as lianeIds,
                                  st_simplify(geometry, simplify_factor) as geometry
                           FROM route
                                  INNER JOIN liane_request lr ON route.way_points = lr.way_points
                           WHERE matching_weekdays(weekDays, lr.week_days)::integer != 0
                             AND geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
                           GROUP BY route.geometry),
       liane_tile AS (SELECT ST_AsMVT(x.*, 'liane_display', 4096, 'geom') AS tile
                      FROM (SELECT array_length(lianeIds, 1) as count,
                                   lianeIds,
                                   ST_AsMVTGeom(
                                     ST_Transform(geometry, 3857),
                                     ST_TileEnvelope(z, x, y),
                                     4096,
                                     64,
                                     TRUE
                                   )                         AS geom
                            FROM relevant_routes) AS x)
  SELECT INTO mvt liane_tile.tile
  FROM liane_tile;

  RETURN mvt;
END;
$$;

DROP FUNCTION rallying_point_display;

CREATE OR REPLACE FUNCTION rallying_point_display(z integer, x integer, y integer) RETURNS bytea
  immutable
  strict
  parallel safe
  language plpgsql
AS
$$
DECLARE
  mvt BYTEA;
  k_param integer;
BEGIN

  SELECT LEAST(5, COUNT(id))::integer as k_param
  FROM rallying_point
  WHERE location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)
  INTO k_param;
  
  IF z <= 12 THEN -- clustering only for zoom levels 0-12
    WITH points AS (SELECT cluster_id,
                           st_centroid(st_union(geom)) AS geom,
                           COUNT(id)                   AS point_count,
                           ARRAY_AGG(id)               AS ids
                    FROM (SELECT ST_ClusterKMeans(location, k_param) OVER () AS cluster_id,
                                 ST_Centroid(location)                                                       as geom,
                                 id
                          FROM rallying_point
                          WHERE location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)) tsub
                    GROUP BY cluster_id),
         clusters AS (SELECT ST_AsMVT(tile.*, 'rallying_point_display', 4096, 'geom') AS tile
                      FROM (SELECT ST_AsMVTGeom(
                                     ST_Transform(geom, 3857),
                                     ST_TileEnvelope(z, x, y),
                                     4096, 64, TRUE)                                      AS geom,
                                   CASE point_count WHEN 1 THEN NULL ELSE point_count END AS point_count,
                                   ids,
                                   rp.id,
                                   rp.label,
                                   rp.type,
                                   rp.address,
                                   rp.zip_code,
                                   rp.city,
                                   rp.place_count,
                                   rp.is_active
                            FROM points
                                   LEFT JOIN rallying_point rp ON points.point_count = 1 AND rp.id = ANY (points.ids)) AS tile)
    SELECT INTO mvt clusters.tile
    FROM clusters;

    RETURN mvt;
  ELSE
    WITH clusters AS (SELECT ST_AsMVT(tile.*, 'rallying_point_display', 4096, 'geom') AS tile
                      FROM (SELECT ST_AsMVTGeom(
                                     ST_Transform(location, 3857),
                                     ST_TileEnvelope(z, x, y),
                                     4096, 64, TRUE) AS geom,
                                   rp.id,
                                   rp.label,
                                   rp.type,
                                   rp.address,
                                   rp.zip_code,
                                   rp.city,
                                   rp.place_count,
                                   rp.is_active
                            FROM rallying_point rp
                            WHERE location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)) AS tile)
    SELECT INTO mvt clusters.tile
    FROM clusters;

    RETURN mvt;
  END IF;

END
$$;
