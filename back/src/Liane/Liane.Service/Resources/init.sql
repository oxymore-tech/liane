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

CREATE OR REPLACE
  FUNCTION liane_display(z integer, x integer, y integer, query_params json)
  RETURNS bytea AS
$$
DECLARE
  mvt bytea;
BEGIN
  SELECT INTO mvt ST_AsMVT(tile.*, 'liane_display', 4096, 'geom')
  FROM (SELECT ST_AsMVTGeom(
                 st_transform(geom, 3857),
                 ST_TileEnvelope(z, x, y),
                 4096, 64, true) AS geom

        FROM (select geom from (values (null)) s(geom)) as no_geom) as tile
  WHERE geom IS NOT NULL;

  RETURN mvt;
END
$$ LANGUAGE plpgsql IMMUTABLE
                    STRICT
                    PARALLEL SAFE;