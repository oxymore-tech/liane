DROP FUNCTION rallying_point_display;

CREATE OR REPLACE FUNCTION rallying_point_display(z integer, x integer, y integer) RETURNS bytea
  immutable
  strict
  parallel safe
  language plpgsql
AS
$$
DECLARE
  mvt                 BYTEA;
BEGIN
  
  IF z <= 12 THEN -- clustering only for zoom levels 0-12
    WITH points AS (
      SELECT
        cluster_id,
        st_centroid(st_union(geom)) AS geom,
        COUNT(id)                                    AS point_count,
        ARRAY_AGG(id)                                AS ids
      FROM
        (
          SELECT
              ST_ClusterKMeans(location, 5) OVER() AS cluster_id,
              ST_Centroid(location) as geom,
              id
          FROM rallying_point
          WHERE location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)
        ) tsub
      GROUP BY cluster_id
    ),
         clusters AS (
           SELECT ST_AsMVT(tile.*, 'rallying_point_display', 4096, 'geom') AS tile
           FROM (
                  SELECT ST_AsMVTGeom(
                           ST_Transform(geom, 3857),
                           ST_TileEnvelope(z, x, y),
                           4096, 64, TRUE) AS geom,
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
                         LEFT JOIN rallying_point rp ON points.point_count = 1 AND rp.id = ANY (points.ids)
                ) AS tile
         )
    SELECT INTO mvt clusters.tile
    FROM clusters;

    RETURN mvt;
  ELSE
    WITH clusters AS (
           SELECT ST_AsMVT(tile.*, 'rallying_point_display', 4096, 'geom') AS tile
           FROM (
                  SELECT ST_AsMVTGeom(
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
                  WHERE location @ ST_Transform(ST_TileEnvelope(z, x, y), 4326)
                ) AS tile
         )
    SELECT INTO mvt clusters.tile
    FROM clusters;

    RETURN mvt;
  END IF;
  
END
$$;
