-- Suppression de compte : la ligne "user" reste comme coquille anonyme (deleted_at renseigné,
-- téléphone remplacé, nom effacé) pour que les trajets attestés gardent leur conducteur et leur passager.
-- proof_identity_key et proof_phone_trunc sont les deux seules données d'identité conservées, sous la forme
-- pseudonymisée que demande le registre de preuve de covoiturage, et seulement si le compte supprimé
-- figure dans un trajet attesté.
ALTER TABLE "user"
    ADD COLUMN deleted_at           TIMESTAMPTZ,
    ADD COLUMN proof_identity_key   VARCHAR(64),
    ADD COLUMN proof_phone_trunc    VARCHAR(20);
