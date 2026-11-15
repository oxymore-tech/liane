-- Abonnements Web Push : un par appareil (navigateur), plusieurs par utilisateur.
-- Remplace les colonnes push_* de "user", qui ne permettaient qu'un seul appareil.

CREATE TABLE push_subscription (
    id          UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX push_subscription_user_idx ON push_subscription (user_id);

INSERT INTO push_subscription (user_id, endpoint, p256dh, auth)
SELECT id, push_endpoint, push_p256dh, push_auth
FROM "user"
WHERE push_endpoint IS NOT NULL
  AND push_p256dh IS NOT NULL
  AND push_auth IS NOT NULL
ON CONFLICT (endpoint) DO NOTHING;

ALTER TABLE "user"
    DROP COLUMN push_endpoint,
    DROP COLUMN push_p256dh,
    DROP COLUMN push_auth;
