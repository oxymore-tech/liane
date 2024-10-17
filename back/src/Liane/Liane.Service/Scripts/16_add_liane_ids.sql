DROP FUNCTION IF EXISTS liane_display;

CREATE OR REPLACE FUNCTION liane_display(z integer, x integer, y integer) returns bytea
  immutable
  strict
  parallel safe
  language plpgsql
as
$$
DECLARE
  mvt BYTEA;
  simplify_factor double precision;
BEGIN

  SELECT (case
            when z < 5 then 0.03
            when z < 7 then 0.005
            when z < 10 then 0.001
            else 0.00000001 end)
  INTO simplify_factor;

  WITH
    relevant_routes AS (
      SELECT
        array_agg(lr.id) as lianeIds,
        st_simplify(geometry, simplify_factor) as geometry
      FROM route
        INNER JOIN liane_request lr ON route.way_points = lr.way_points
      WHERE
        geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
      GROUP BY route.geometry
    ),
    liane_tile AS (
      SELECT ST_AsMVT(x.*, 'liane_display', 4096, 'geom') AS tile
      FROM (
             SELECT
               array_length(lianeIds, 1) as count,
               lianeIds,
               ST_AsMVTGeom(
                 ST_Transform(geometry, 3857),
                 ST_TileEnvelope(z, x, y),
                 4096,
                 64,
                 TRUE
               ) AS geom
             FROM relevant_routes
           ) AS x
    )
  SELECT INTO mvt liane_tile.tile
  FROM liane_tile;

  RETURN mvt;
END;
$$;