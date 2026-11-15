-- Tronçons de la carte : là où plusieurs lianes empruntent la même route, la carte dessine un seul trait.
-- Les tracés des lianes actives sont découpés à chaque point où ils se rejoignent ou se séparent ;
-- chaque tronçon porte la liste des lianes qui l'empruntent. La table est recalculée en entier à chaque
-- changement de tracé ou d'activation d'une liane (déclencheur ci-dessous) : quelques millisecondes pour
-- des dizaines de lianes.
CREATE TABLE liane_segment (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    liane_ids   UUID[] NOT NULL,
    geom        GEOMETRY(MultiLineString, 4326) NOT NULL
);

CREATE INDEX liane_segment_geom_idx ON liane_segment USING GIST (geom);

CREATE OR REPLACE FUNCTION refresh_liane_segments() RETURNS void AS $$
BEGIN
    LOCK TABLE liane_segment IN EXCLUSIVE MODE;
    DELETE FROM liane_segment;

    INSERT INTO liane_segment (liane_ids, geom)
    WITH line AS (
        SELECT id, route FROM liane WHERE is_active AND route IS NOT NULL
    ),
    -- L'union découpe les tracés à tous leurs points de rencontre et ne garde qu'un exemplaire des parties communes.
    piece AS (
        SELECT ROW_NUMBER() OVER () AS id, dumped.geom
        FROM (SELECT (ST_Dump(ST_Union(route))).geom FROM line) dumped
        WHERE ST_Length(dumped.geom) > 0
    ),
    -- Un morceau appartient aux lianes dont le tracé passe par son milieu (à un centimètre près).
    covered AS (
        SELECT piece.id, piece.geom, array_agg(line.id ORDER BY line.id) AS liane_ids
        FROM piece
        INNER JOIN line ON ST_DWithin(line.route, ST_LineInterpolatePoint(piece.geom, 0.5), 0.0000001)
        GROUP BY piece.id, piece.geom
    )
    SELECT liane_ids, ST_Multi(ST_LineMerge(ST_Collect(geom)))
    FROM covered
    GROUP BY liane_ids;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION liane_segments_changed() RETURNS trigger AS $$
BEGIN
    PERFORM refresh_liane_segments();
    RETURN NULL;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER liane_segments_refresh
    AFTER INSERT OR DELETE OR UPDATE OF route, is_active ON liane
    FOR EACH STATEMENT EXECUTE FUNCTION liane_segments_changed();

SELECT refresh_liane_segments();

-- Tuiles des tronçons. member_count : total des membres des lianes du tronçon (épaisseur du trait).
-- slugs : « |slug-1|slug-2| », pour mettre en valeur la liane choisie sur tous ses tronçons.
CREATE OR REPLACE FUNCTION liane_segment_display(z integer, x integer, y integer)
RETURNS bytea AS $$
    SELECT ST_AsMVT(tile, 'liane_segment_display', 4096, 'geom')
    FROM (
        SELECT
            cardinality(s.liane_ids) AS liane_count,
            (SELECT COUNT(*) FROM liane_member lm WHERE lm.liane_id = ANY(s.liane_ids))::integer AS member_count,
            (SELECT '|' || string_agg(l.slug, '|') || '|' FROM liane l WHERE l.id = ANY(s.liane_ids)) AS slugs,
            ST_AsMVTGeom(
                ST_Simplify(
                    ST_Transform(s.geom, 3857),
                    (ST_XMax(ST_TileEnvelope(z, x, y)) - ST_XMin(ST_TileEnvelope(z, x, y))) / 4096 * 4,
                    true
                ),
                ST_TileEnvelope(z, x, y),
                4096, 64, true
            ) AS geom
        FROM liane_segment s
        WHERE s.geom && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
    ) AS tile
    WHERE geom IS NOT NULL
$$ LANGUAGE SQL STABLE PARALLEL SAFE;
