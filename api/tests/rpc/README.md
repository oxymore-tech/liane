# Schéma du registre de preuve de covoiturage

`journey-create.v3.4.schema.json` est le schéma du corps de `POST /journeys` (opération `acquisition:create`)
de l'API v3.4 du registre de preuve de covoiturage, extrait le 2026-11-15 du fichier OpenAPI officiel
<https://tech.covoiturage.beta.gouv.fr/source.json> (sha256 `64a4e1e006daf069655a8b87b3b973943473559074b1e20de6d2f93b471caf83`),
chemin `paths./journeys.post.requestBody.content.application/json.schema`.

Seules transformations : les `$ref` sont résolus sur place et le mot-clé OpenAPI `example` devient `examples`.
Aucune contrainte n'est ajoutée ni retirée. `api/tests/trip.rs` valide l'export administrateur contre ce fichier.
Quand le registre publie une nouvelle version, remplacer ce fichier par le nouvel extrait et relancer les tests.
