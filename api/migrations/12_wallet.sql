-- Partage des frais : un utilisateur ouvre un porte-monnaie s'il veut payer ou être payé.
-- Sans porte-monnaie, il covoiture quand même, sans partage des frais dans Liane.
ALTER TABLE "user" ADD COLUMN wallet_opened_at TIMESTAMPTZ;

-- L'ancien partage indicatif (barème divisé entre les occupants) laisse la place au tarif de Liane.
ALTER TABLE trip_member DROP COLUMN indicative_contribution_cents;

-- Ce qu'un passager doit à un conducteur pour un trajet fait. Le montant est figé à l'inscription :
-- la distance et le tarif appliqués sont gardés pour l'expliquer.
-- month est le premier jour du mois du trajet (heure de Paris) ; l'échéance est la fin de ce mois.
CREATE TABLE wallet_entry (
    id              UUID PRIMARY KEY DEFAULT uuidv7(),
    trip_id         UUID NOT NULL REFERENCES trip(id),
    passenger_id    UUID NOT NULL REFERENCES "user"(id),
    driver_id       UUID NOT NULL REFERENCES "user"(id),
    distance_meters INTEGER NOT NULL,
    cents_per_km    INTEGER NOT NULL,
    amount_cents    INTEGER NOT NULL,
    month           DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wallet_entry_distinct_users_check CHECK (passenger_id <> driver_id),
    CONSTRAINT wallet_entry_amount_check CHECK (amount_cents >= 0),
    CONSTRAINT wallet_entry_month_check CHECK (EXTRACT(DAY FROM month) = 1),
    UNIQUE (trip_id, passenger_id)
);

CREATE INDEX wallet_entry_passenger_month_idx ON wallet_entry (passenger_id, month);
CREATE INDEX wallet_entry_driver_month_idx ON wallet_entry (driver_id, month);
