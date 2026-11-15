-- Tuiles des points de ralliement : la géométrie (4326) doit être projetée en 3857 pour ST_AsMVTGeom.

CREATE INDEX rallying_point_geometry_idx ON rallying_point USING GIST ((location::geometry));

CREATE OR REPLACE FUNCTION rallying_point_display(z integer, x integer, y integer)
RETURNS bytea AS $$
    SELECT ST_AsMVT(tile, 'rallying_point_display', 4096, 'geom')
    FROM (
        SELECT
            id::text AS id,
            label,
            kind,
            city,
            is_active,
            ST_AsMVTGeom(
                ST_Transform(location::geometry, 3857),
                ST_TileEnvelope(z, x, y),
                4096, 64, true
            ) AS geom
        FROM rallying_point
        WHERE location::geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
          AND is_active = true
    ) AS tile
    WHERE geom IS NOT NULL
$$ LANGUAGE SQL STABLE PARALLEL SAFE;

-- Une liane devient une ligne : nom, slug, arrêts ordonnés, tracé.
-- Les lianes de l'ancien modèle (groupes privés) sont conservées mais désactivées.

DELETE FROM liane_member WHERE is_pending;

ALTER TABLE liane
    ADD COLUMN name         VARCHAR(255),
    ADD COLUMN slug         VARCHAR(120),
    ADD COLUMN route        GEOMETRY(LineString, 4326),
    ADD COLUMN is_active    BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN created_by   UUID REFERENCES "user"(id),
    ADD COLUMN updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- La clé étrangère vers rallying_point (sans cascade) fait échouer toute suppression
-- d'un point de ralliement utilisé comme arrêt.
CREATE TABLE liane_stop (
    liane_id            UUID NOT NULL REFERENCES liane(id) ON DELETE CASCADE,
    rallying_point_id   UUID NOT NULL REFERENCES rallying_point(id),
    ordinal             INTEGER NOT NULL,
    PRIMARY KEY (liane_id, ordinal),
    UNIQUE (liane_id, rallying_point_id)
);

CREATE INDEX liane_stop_rallying_point_idx ON liane_stop (rallying_point_id);

INSERT INTO liane_stop (liane_id, rallying_point_id, ordinal)
SELECT
    legacy.liane_id,
    legacy.rallying_point_id,
    ROW_NUMBER() OVER (PARTITION BY legacy.liane_id ORDER BY legacy.first_ordinal) - 1
FROM (
    SELECT l.id AS liane_id, waypoint.id AS rallying_point_id, MIN(waypoint.ordinal) AS first_ordinal
    FROM liane l
    CROSS JOIN LATERAL unnest(l.waypoints) WITH ORDINALITY AS waypoint(id, ordinal)
    INNER JOIN rallying_point rp ON rp.id = waypoint.id
    GROUP BY l.id, waypoint.id
) legacy;

-- Une ancienne liane dont on ne retrouve pas au moins deux arrêts n'est pas convertible.
DELETE FROM liane l
WHERE (SELECT COUNT(*) FROM liane_stop s WHERE s.liane_id = l.id) < 2;

UPDATE liane l
SET is_active = false,
    slug = 'liane-' || l.id,
    name = legacy.name,
    route = legacy.route
FROM (
    SELECT
        s.liane_id,
        (array_agg(rp.city ORDER BY s.ordinal))[1]
            || ' – ' || (array_agg(rp.city ORDER BY s.ordinal DESC))[1] AS name,
        ST_MakeLine(rp.location::geometry ORDER BY s.ordinal) AS route
    FROM liane_stop s
    INNER JOIN rallying_point rp ON rp.id = s.rallying_point_id
    GROUP BY s.liane_id
) legacy
WHERE legacy.liane_id = l.id;

ALTER TABLE liane
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN slug SET NOT NULL,
    ADD CONSTRAINT liane_slug_key UNIQUE (slug),
    DROP COLUMN waypoints,
    DROP COLUMN round_trip,
    DROP COLUMN arrive_before,
    DROP COLUMN return_after,
    DROP COLUMN week_days;

CREATE INDEX liane_route_idx ON liane USING GIST (route);

-- Jours, sens, horaires indicatifs et « peut conduire » appartiennent au membre.
-- board_rp_id et alight_rp_id sont exprimés dans le sens aller (ordre des arrêts de la liane).

ALTER TABLE liane_member
    ADD COLUMN board_rp_id      UUID,
    ADD COLUMN alight_rp_id     UUID,
    ADD COLUMN week_days        VARCHAR(7) NOT NULL DEFAULT '0000000',
    ADD COLUMN direction        VARCHAR(10) NOT NULL DEFAULT 'Both',
    ADD COLUMN can_drive        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN outbound_time    TIME,
    ADD COLUMN return_time      TIME;

UPDATE liane_member lm
SET board_rp_id = (
        SELECT s.rallying_point_id FROM liane_stop s
        WHERE s.liane_id = lm.liane_id ORDER BY s.ordinal LIMIT 1
    ),
    alight_rp_id = (
        SELECT s.rallying_point_id FROM liane_stop s
        WHERE s.liane_id = lm.liane_id ORDER BY s.ordinal DESC LIMIT 1
    ),
    week_days = lr.week_days,
    direction = CASE WHEN lr.round_trip THEN 'Both' ELSE 'Outbound' END,
    can_drive = lr.can_drive,
    outbound_time = lr.arrive_before,
    return_time = CASE WHEN lr.round_trip THEN lr.return_after END
FROM liane_request lr
WHERE lr.id = lm.liane_request_id;

ALTER TABLE liane_member
    DROP COLUMN is_pending,
    ALTER COLUMN liane_request_id DROP NOT NULL,
    ALTER COLUMN board_rp_id SET NOT NULL,
    ALTER COLUMN alight_rp_id SET NOT NULL,
    ADD CONSTRAINT liane_member_direction_check
        CHECK (direction IN ('Outbound', 'Return', 'Both')),
    ADD CONSTRAINT liane_member_distinct_stops_check
        CHECK (board_rp_id <> alight_rp_id),
    ADD CONSTRAINT liane_member_board_stop_fkey
        FOREIGN KEY (liane_id, board_rp_id)
        REFERENCES liane_stop (liane_id, rallying_point_id)
        DEFERRABLE INITIALLY IMMEDIATE,
    ADD CONSTRAINT liane_member_alight_stop_fkey
        FOREIGN KEY (liane_id, alight_rp_id)
        REFERENCES liane_stop (liane_id, rallying_point_id)
        DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX liane_member_user_idx ON liane_member (user_id);

-- Signalement d'un membre par un autre membre de la même liane, traité par un administrateur.

CREATE TABLE liane_report (
    id                  UUID PRIMARY KEY DEFAULT uuidv7(),
    liane_id            UUID NOT NULL REFERENCES liane(id) ON DELETE CASCADE,
    reported_user_id    UUID NOT NULL REFERENCES "user"(id),
    reporter_user_id    UUID NOT NULL REFERENCES "user"(id),
    reason              VARCHAR(500) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Open',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    resolved_by         UUID REFERENCES "user"(id),
    CONSTRAINT liane_report_status_check CHECK (status IN ('Open', 'Excluded', 'Dismissed')),
    CONSTRAINT liane_report_not_self_check CHECK (reported_user_id <> reporter_user_id)
);

CREATE UNIQUE INDEX liane_report_open_idx
    ON liane_report (liane_id, reported_user_id, reporter_user_id)
    WHERE status = 'Open';

-- Tuiles Martin : tracés des lianes actives et leurs arrêts.

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
                ST_Transform(l.route, 3857),
                ST_TileEnvelope(z, x, y),
                4096, 64, true
            ) AS geom
        FROM liane l
        WHERE l.is_active
          AND l.route && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
    ) AS tile
    WHERE geom IS NOT NULL
$$ LANGUAGE SQL STABLE PARALLEL SAFE;

CREATE OR REPLACE FUNCTION liane_stop_display(z integer, x integer, y integer)
RETURNS bytea AS $$
    SELECT ST_AsMVT(tile, 'liane_stop_display', 4096, 'geom')
    FROM (
        SELECT
            rp.id::text AS id,
            rp.label,
            rp.city,
            ST_AsMVTGeom(
                ST_Transform(rp.location::geometry, 3857),
                ST_TileEnvelope(z, x, y),
                4096, 64, true
            ) AS geom
        FROM rallying_point rp
        WHERE rp.location::geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
          AND EXISTS (
              SELECT 1
              FROM liane_stop s
              INNER JOIN liane l ON l.id = s.liane_id
              WHERE s.rallying_point_id = rp.id
                AND l.is_active
          )
    ) AS tile
    WHERE geom IS NOT NULL
$$ LANGUAGE SQL STABLE PARALLEL SAFE;
