-- Un trajet daté appartient à une liane (ligne) : un membre conduit entre deux arrêts de la liane,
-- d'autres membres s'inscrivent comme passagers sur un tronçon compris dans le sien.
-- Plus de géolocalisation permanente : chaque occupant déclare le début et la fin de son trajet
-- (trip_event), avec l'heure du serveur et, s'il l'accepte, une position ponctuelle.

-- Les trajets de l'ancien modèle n'ont ni tronçon ni places : ceux qui ont un conducteur sont
-- conservés comme annulés, les autres ne sont pas convertibles.
DELETE FROM trip WHERE driver_id IS NULL;

DROP TABLE trip_waypoint;

ALTER TABLE trip
    DROP COLUMN return_trip_id,
    ADD COLUMN direction        VARCHAR(10),
    ADD COLUMN from_rp_id       UUID REFERENCES rallying_point(id),
    ADD COLUMN to_rp_id         UUID REFERENCES rallying_point(id),
    ADD COLUMN seat_count       INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN distance_meters  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN canceled_at      TIMESTAMPTZ;

UPDATE trip t
SET state = 'Canceled',
    canceled_at = NOW(),
    direction = 'Outbound',
    from_rp_id = (
        SELECT s.rallying_point_id FROM liane_stop s
        WHERE s.liane_id = t.liane_id ORDER BY s.ordinal LIMIT 1
    ),
    to_rp_id = (
        SELECT s.rallying_point_id FROM liane_stop s
        WHERE s.liane_id = t.liane_id ORDER BY s.ordinal DESC LIMIT 1
    );

-- from_rp_id et to_rp_id sont exprimés dans le sens du trajet (départ, arrivée).
-- Ils ne référencent pas liane_stop : un trajet passé reste valable si la liane change d'arrêts.
ALTER TABLE trip
    ALTER COLUMN driver_id SET NOT NULL,
    ALTER COLUMN direction SET NOT NULL,
    ALTER COLUMN from_rp_id SET NOT NULL,
    ALTER COLUMN to_rp_id SET NOT NULL,
    ALTER COLUMN state SET DEFAULT 'Planned',
    ADD CONSTRAINT trip_direction_check CHECK (direction IN ('Outbound', 'Return')),
    ADD CONSTRAINT trip_state_check CHECK (state IN ('Planned', 'Started', 'Finished', 'Canceled')),
    ADD CONSTRAINT trip_distinct_stops_check CHECK (from_rp_id <> to_rp_id),
    ADD CONSTRAINT trip_seat_count_check CHECK (seat_count BETWEEN 1 AND 8);

CREATE INDEX trip_liane_departure_idx ON trip (liane_id, departure_time);
CREATE INDEX trip_driver_idx ON trip (driver_id);

-- trip_member ne contient que les passagers ; le conducteur est porté par trip.driver_id.
-- Une ligne est aussi le couple conducteur/passager attendu par le registre de preuve de covoiturage :
-- elle porte la classe de preuve (A, B, C), le détail qui la justifie et les montants.
-- Aucun paiement pour l'instant : contribution_cents et driver_revenue_cents restent nuls,
-- indicative_contribution_cents est un partage de frais indicatif calculé d'après la distance.
ALTER TABLE trip_member
    DROP COLUMN geolocation_level,
    DROP COLUMN departure,
    DROP COLUMN arrival;

ALTER TABLE trip_member RENAME COLUMN cancellation TO canceled_at;

ALTER TABLE trip_member
    ADD COLUMN created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN distance_meters                  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN indicative_contribution_cents    INTEGER,
    ADD COLUMN contribution_cents               INTEGER,
    ADD COLUMN driver_revenue_cents             INTEGER,
    ADD COLUMN proof_class                      VARCHAR(1),
    ADD COLUMN proof_detail                     JSONB,
    ADD COLUMN proof_computed_at                TIMESTAMPTZ,
    ADD CONSTRAINT trip_member_distinct_stops_check CHECK (from_rp_id <> to_rp_id),
    ADD CONSTRAINT trip_member_proof_class_check CHECK (proof_class IN ('A', 'B', 'C'));

CREATE INDEX trip_member_user_idx ON trip_member (user_id);

-- Un geste déclaré par un occupant sur son propre téléphone : début (Start) ou fin (End) de son trajet.
-- recorded_at est l'heure du serveur. La position est absente si elle a été refusée (Denied)
-- ou n'a pas pu être obtenue (Unavailable) ; le geste est enregistré quand même.
CREATE TABLE trip_event (
    id                      UUID PRIMARY KEY DEFAULT uuidv7(),
    trip_id                 UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES "user"(id),
    kind                    VARCHAR(10) NOT NULL,
    recorded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    position_status         VARCHAR(20) NOT NULL,
    lat                     DOUBLE PRECISION,
    lng                     DOUBLE PRECISION,
    accuracy_meters         REAL,
    expected_rp_id          UUID NOT NULL REFERENCES rallying_point(id),
    distance_to_stop_meters INTEGER,
    CONSTRAINT trip_event_kind_check CHECK (kind IN ('Start', 'End')),
    CONSTRAINT trip_event_position_status_check
        CHECK (position_status IN ('Granted', 'Denied', 'Unavailable')),
    CONSTRAINT trip_event_position_check
        CHECK ((position_status = 'Granted') = (lat IS NOT NULL AND lng IS NOT NULL)),
    UNIQUE (trip_id, user_id, kind)
);
