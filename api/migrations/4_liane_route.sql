-- Tracé routier des lianes : origine du tracé, distance et durée totales, distance cumulée de chaque arrêt.
-- Les lianes existantes gardent leur ligne droite (route_source = 'Straight') jusqu'à leur recalcul
-- (POST /api/liane/admin/recompute_routes) ; leur distance est celle de la ligne droite, sans durée.

ALTER TABLE liane
    ADD COLUMN route_source     VARCHAR(10) NOT NULL DEFAULT 'Straight',
    ADD COLUMN distance_meters  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN duration_seconds INTEGER,
    ADD CONSTRAINT liane_route_source_check CHECK (route_source IN ('Osrm', 'Straight'));

-- Distance le long du tracé depuis le premier arrêt (0 pour le premier).
ALTER TABLE liane_stop
    ADD COLUMN distance_meters INTEGER NOT NULL DEFAULT 0;

UPDATE liane_stop s
SET distance_meters = cumulative.distance
FROM (
    SELECT
        leg.liane_id,
        leg.ordinal,
        ROUND(SUM(leg.length) OVER (PARTITION BY leg.liane_id ORDER BY leg.ordinal))::integer AS distance
    FROM (
        SELECT
            s.liane_id,
            s.ordinal,
            COALESCE(
                ST_Distance(
                    rp.location,
                    LAG(rp.location) OVER (PARTITION BY s.liane_id ORDER BY s.ordinal)
                ),
                0
            ) AS length
        FROM liane_stop s
        INNER JOIN rallying_point rp ON rp.id = s.rallying_point_id
    ) leg
) cumulative
WHERE cumulative.liane_id = s.liane_id
  AND cumulative.ordinal = s.ordinal;

UPDATE liane l
SET distance_meters = COALESCE(
    (SELECT MAX(s.distance_meters) FROM liane_stop s WHERE s.liane_id = l.id),
    0
);

-- Un tracé routier compte des centaines de points : on le simplifie selon le zoom avant de le découper.
-- La tolérance vaut 4 unités de la grille de la tuile (4096), soit un demi-pixel d'une tuile affichée en 512 px.
-- La simplification porte sur le tracé entier : elle est identique d'une tuile à l'autre, sans raccord visible.
CREATE OR REPLACE FUNCTION liane_display(z integer, x integer, y integer)
RETURNS bytea AS $$
    SELECT ST_AsMVT(tile, 'liane_display', 4096, 'geom')
    FROM (
        SELECT
            l.id::text AS id,
            l.name,
            l.slug,
            (SELECT COUNT(*) FROM liane_member lm WHERE lm.liane_id = l.id)::integer AS member_count,
            ST_AsMVTGeom(
                ST_Simplify(
                    ST_Transform(l.route, 3857),
                    (ST_XMax(ST_TileEnvelope(z, x, y)) - ST_XMin(ST_TileEnvelope(z, x, y))) / 4096 * 4,
                    true
                ),
                ST_TileEnvelope(z, x, y),
                4096, 64, true
            ) AS geom
        FROM liane l
        WHERE l.is_active
          AND l.route && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
    ) AS tile
    WHERE geom IS NOT NULL
$$ LANGUAGE SQL STABLE PARALLEL SAFE;
