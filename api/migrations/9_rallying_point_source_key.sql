-- Clé stable d'un point de ralliement dans sa source : « bnlc:<id_lieu> », « mairie:<code INSEE> »,
-- « liane:<nom> ». La régénération met à jour les points par cette clé au lieu de tout recréer :
-- les identifiants ne changent plus, un point disparu de la source est désactivé, jamais supprimé.
-- Sans clé : point créé autrement, ou généré avant cette migration (la première régénération lui
-- retrouve sa clé par son nom, son type et sa position).
ALTER TABLE rallying_point ADD COLUMN source_key VARCHAR(80);

CREATE UNIQUE INDEX rallying_point_source_key_idx ON rallying_point (source_key);

-- La fonction uuidv7() de la migration 1 appelait gen_random_bytes(), qui appartient à l'extension
-- pgcrypto, jamais installée : toute insertion échouait avant PostgreSQL 18. À partir de la version 18
-- l'erreur est masquée, la fonction native pg_catalog.uuidv7() passant devant celle-ci.
-- Cette version n'utilise que des fonctions natives (PostgreSQL 13 et suivantes) : un UUID aléatoire
-- dont les 48 premiers bits sont remplacés par l'heure en millisecondes et la version passée de 4 à 7.
CREATE OR REPLACE FUNCTION public.uuidv7() RETURNS uuid AS $$
    SELECT encode(
        set_bit(
            set_bit(
                overlay(
                    uuid_send(gen_random_uuid())
                    PLACING substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
                    FROM 1 FOR 6
                ),
                52, 1
            ),
            53, 1
        ),
        'hex'
    )::uuid
$$ LANGUAGE SQL VOLATILE;
