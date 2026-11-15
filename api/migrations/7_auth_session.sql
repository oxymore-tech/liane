-- Sessions : un jeton n'est valable que tant que sa session existe. Se déconnecter supprime la session ;
-- le droit administrateur est relu en base à chaque requête.
CREATE TABLE user_session (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX user_session_user_idx ON user_session (user_id);

-- Ce qui est compté pour limiter le débit : codes envoyés (SmsSent) et codes refusés (LoginFailed),
-- par numéro et par adresse IP. Les lignes de plus d'un jour sont supprimées au fil de l'eau.
CREATE TABLE auth_event (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind        VARCHAR(20) NOT NULL,
    phone       VARCHAR(20) NOT NULL,
    ip          VARCHAR(45) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT auth_event_kind_check CHECK (kind IN ('SmsSent', 'LoginFailed'))
);

CREATE INDEX auth_event_phone_idx ON auth_event (kind, phone, created_at);
CREATE INDEX auth_event_ip_idx ON auth_event (kind, ip, created_at);
