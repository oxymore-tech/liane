CREATE EXTENSION IF NOT EXISTS postgis;

CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $$
DECLARE
    unix_ts_ms bytea;
    uuid_bytes bytea;
BEGIN
    unix_ts_ms = substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) from 3);
    uuid_bytes = unix_ts_ms || gen_random_bytes(10);
    uuid_bytes = set_byte(uuid_bytes, 6, (b'0111' << 4) | (get_byte(uuid_bytes, 6) & b'00001111'));
    uuid_bytes = set_byte(uuid_bytes, 8, (b'10' << 6) | (get_byte(uuid_bytes, 8) & b'00111111'));
    RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;

CREATE TABLE "user" (
    id              UUID PRIMARY KEY DEFAULT uuidv7(),
    phone           VARCHAR(20) NOT NULL UNIQUE,
    pseudo          VARCHAR(100),
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    gender          VARCHAR(20) NOT NULL DEFAULT 'Unspecified',
    picture_url     TEXT,
    push_endpoint   TEXT,
    push_p256dh     TEXT,
    push_auth       TEXT,
    is_admin        BOOLEAN NOT NULL DEFAULT false,
    is_signed_up    BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sms_code (
    phone           VARCHAR(20) PRIMARY KEY,
    code            VARCHAR(10) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    attempts        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE rallying_point (
    id              UUID PRIMARY KEY DEFAULT uuidv7(),
    label           VARCHAR(255) NOT NULL,
    location        GEOGRAPHY(Point, 4326) NOT NULL,
    kind            VARCHAR(50) NOT NULL,
    address         TEXT NOT NULL DEFAULT '',
    zip_code        VARCHAR(10) NOT NULL DEFAULT '',
    city            VARCHAR(100) NOT NULL DEFAULT '',
    place_count     INTEGER,
    is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX rallying_point_location_idx ON rallying_point USING GIST (location);
CREATE INDEX rallying_point_label_idx ON rallying_point USING gin (
    to_tsvector('french', label || ' ' || city)
);

CREATE TABLE liane_request (
    id              UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id         UUID NOT NULL REFERENCES "user"(id),
    name            VARCHAR(255) NOT NULL DEFAULT '',
    waypoints       UUID[] NOT NULL,
    round_trip      BOOLEAN NOT NULL DEFAULT false,
    arrive_before   TIME NOT NULL,
    return_after    TIME NOT NULL,
    can_drive       BOOLEAN NOT NULL DEFAULT false,
    week_days       VARCHAR(7) NOT NULL DEFAULT '0000000',
    is_enabled      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE liane (
    id              UUID PRIMARY KEY DEFAULT uuidv7(),
    waypoints       UUID[] NOT NULL,
    round_trip      BOOLEAN NOT NULL DEFAULT false,
    arrive_before   TIME NOT NULL,
    return_after    TIME NOT NULL,
    week_days       VARCHAR(7) NOT NULL DEFAULT '0000000',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE liane_member (
    liane_id            UUID NOT NULL REFERENCES liane(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES "user"(id),
    liane_request_id    UUID NOT NULL REFERENCES liane_request(id),
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at        TIMESTAMPTZ,
    is_pending          BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (liane_id, user_id)
);

CREATE TABLE trip (
    id              UUID PRIMARY KEY DEFAULT uuidv7(),
    liane_id        UUID NOT NULL REFERENCES liane(id),
    departure_time  TIMESTAMPTZ NOT NULL,
    return_trip_id  UUID REFERENCES trip(id),
    driver_id       UUID REFERENCES "user"(id),
    state           VARCHAR(20) NOT NULL DEFAULT 'NotStarted',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES "user"(id)
);

CREATE TABLE trip_waypoint (
    trip_id             UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    rallying_point_id   UUID NOT NULL REFERENCES rallying_point(id),
    ordinal             INTEGER NOT NULL,
    eta                 TIMESTAMPTZ NOT NULL,
    duration_secs       INTEGER NOT NULL DEFAULT 0,
    distance_meters     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (trip_id, ordinal)
);

CREATE TABLE trip_member (
    trip_id         UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES "user"(id),
    from_rp_id      UUID NOT NULL REFERENCES rallying_point(id),
    to_rp_id        UUID NOT NULL REFERENCES rallying_point(id),
    seat_count      INTEGER NOT NULL DEFAULT 1,
    geolocation_level VARCHAR(20) NOT NULL DEFAULT 'None',
    cancellation    TIMESTAMPTZ,
    departure       TIMESTAMPTZ,
    arrival         TIMESTAMPTZ,
    PRIMARY KEY (trip_id, user_id)
);

CREATE TABLE liane_message (
    id              UUID PRIMARY KEY DEFAULT uuidv7(),
    liane_id        UUID NOT NULL REFERENCES liane(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES "user"(id),
    content_type    VARCHAR(50) NOT NULL,
    content_value   TEXT NOT NULL DEFAULT '',
    content_data    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX liane_message_liane_idx ON liane_message (liane_id, created_at DESC);

CREATE OR REPLACE FUNCTION rallying_point_display(z integer, x integer, y integer)
RETURNS bytea AS $$
    SELECT ST_AsMVT(tile, 'rallying_point_display', 4096, 'geom')
    FROM (
        SELECT
            id,
            label,
            kind,
            city,
            is_active,
            ST_AsMVTGeom(
                location::geometry,
                ST_TileEnvelope(z, x, y),
                4096, 64, true
            ) AS geom
        FROM rallying_point
        WHERE location::geometry && ST_TileEnvelope(z, x, y)
          AND is_active = true
    ) AS tile
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;
