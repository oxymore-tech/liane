# Liane

Liane est un service de covoiturage pour les territoires ruraux. Une **liane** est une ligne de covoiturage
publique : un nom, des arrêts dans l'ordre, un tracé. Les habitants la rejoignent sur un tronçon, proposent des
**trajets** datés, s'y inscrivent, et s'écrivent par **messages**. Chaque trajet fait produit une preuve de
covoiturage.

Cette branche contient la réécriture du projet :

| Dossier | Rôle | Pile |
|---|---|---|
| `api/` | API HTTP, règles métier, migrations | Rust, Axum 0.8, SQLx, PostgreSQL 18 + PostGIS |
| `web/` | Site et application installable (PWA) | Next.js 16, React 19, Tailwind 4, MapLibre, Serwist |
| `cli/` | Outil de développement `liane` | Rust, Clap |
| `deploy/` | Fichiers Docker Compose, configuration des tuiles (Martin), jeux de démonstration, parcours navigateur | |

Les dossiers `back/` (.NET), `app/` (React Native), `common/` et le `Dockerfile` de la racine appartiennent à
l'ancienne version. Ils ne sont plus utilisés par la réécriture (voir « Ancienne version » plus bas).

## État

Ce qui fonctionne, vérifié par les tests automatiques et par des parcours dans un navigateur :

- connexion par code SMS, sessions révocables, limite de débit, suppression de son compte ;
- lianes : carte publique, recherche « D'où partez-vous ? Où allez-vous ? », fiche, adhésion sur un tronçon,
  signalement d'un membre ; administration (créer, modifier, désactiver, supprimer, traiter les signalements) ;
- tracé des lianes par la route (OSRM), ligne droite si OSRM ne répond pas ;
- trajets datés, inscription des passagers, départ et arrivée déclarés sur le téléphone, classe de preuve A, B ou C ;
- messages d'une liane, en direct ;
- export des preuves au format du registre de preuve de covoiturage (API v3.4), validé contre son schéma officiel.

Ce qui est écrit et testé sans jamais avoir été branché sur le service réel :

- l'envoi des SMS par Brevo (essayé contre un faux serveur local) ;
- l'envoi des notifications Web Push (chiffrement et signature vérifiés par un récepteur indépendant, jamais
  envoyé à un vrai navigateur) ; il est désactivé par défaut (`PUSH_PROVIDER=log`) ;
- les fichiers de mise en production (`deploy/production.yml`) : images construites et essayées localement,
  jamais déployées, jamais mises derrière Traefik.

Ce qui n'existe pas : l'envoi au registre de preuve (l'export est un fichier), le paiement, l'application mobile
native, un écran pour donner ou retirer le droit administrateur (voir « Administrateurs »).

## Développer

Prérequis : Docker, Rust (édition 2024), Node 24 avec corepack (yarn 4).

```bash
cd cli && cargo install --path .            # installe la commande « liane »
liane start                                 # PostgreSQL + PostGIS et Martin (deploy/local.yml)

cd api && cargo run                         # API sur http://localhost:5000, migrations appliquées au démarrage
cd web && yarn install && yarn dev          # site sur http://localhost:3000
liane seed                                  # jeu de démonstration : quatre lianes en Lozère, membres, trajets
```

`liane` cherche le dépôt dans `~/workspace/perso/liane`, ou dans `LIANE_HOME`. `liane start` crée `deploy/.env`
depuis `deploy/.env.example` (ou lui ajoute les variables manquantes) et crée la base `liane_test` des tests.
`liane start --purge` repart d'une base vide.

L'API lit `api/.env`, puis, en développement, `deploy/.env` pour ce qui n'y figure pas. Avec `SMS_PROVIDER=log`,
le code de connexion est écrit dans le journal de l'API. Le compte de démonstration (`+33600000000`, code
`000000`) est administrateur.

Tracé routier : `liane start` ouvre un tunnel SSH de `localhost:5001` vers le serveur OSRM de gjini.co
(`OSRM_TUNNEL` dans `deploy/.env`), et `liane stop` le ferme. Sans accès SSH, vider `OSRM_TUNNEL` : les tracés
sont alors des lignes droites. Pour un OSRM local, copier les fichiers `occitanie.osrm*` dans `data/osrm`, vider
`OSRM_TUNNEL` et mettre `COMPOSE_PROFILES=osrm`.

`liane seed` charge les points de ralliement de test (sept départements d'Occitanie). Pour la France entière
(36 000 points, 2 secondes) : `POST /api/rallying_point/generate` avec un compte administrateur. La commande
peut être relancée : elle met à jour les points par leur clé d'origine sans changer leurs identifiants.

Vérifications :

```bash
cd api && cargo fmt --check && cargo clippy --all-targets && cargo test
TEST_DATABASE_URL=postgres://liane:liane@localhost:5432/liane_test cargo test -- --include-ignored   # avec une base
cd web && yarn lint && yarn tsc --noEmit && yarn build
```

## Configuration de l'API

| Variable | Rôle | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `DATABASE_URL` | Base PostgreSQL + PostGIS | oui | |
| `JWT_SECRET` | Signature des jetons de session | oui | |
| `SMS_PROVIDER` | `brevo` (envoi réel) ou `log` (développement : code dans le journal) | oui | |
| `SMS_API_KEY` | Clé d'API Brevo | si `SMS_PROVIDER=brevo` | |
| `SMS_API_URL` | Adresse de l'API SMS de Brevo | non | `https://api.brevo.com/v3/transactionalSMS/sms` |
| `SMS_SENDER` | Nom d'expéditeur des SMS | non | `Liane` |
| `PORT` | Port d'écoute | non | `5000` |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées, séparées par des virgules | non | aucune |
| `TRUSTED_PROXY_COUNT` | Nombre de mandataires de confiance devant l'API, pour lire l'adresse du client dans `X-Forwarded-For` | non | `0` |
| `OSRM_URL` | Serveur OSRM du tracé des lianes | non | vide : lignes droites |
| `PUSH_PROVIDER` | `log` (rien n'est envoyé) ou `webpush` | non | `log` |
| `VAPID_PUBLIC_KEY` | Clé publique donnée aux navigateurs ; vide : les notifications ne sont pas proposées | si `webpush` | |
| `VAPID_PRIVATE_KEY` | Clé privée de signature des envois | si `webpush` | |
| `VAPID_SUBJECT` | Contact de l'exploitant (`mailto:…` ou `https://…`) | si `webpush` | |
| `AUTH_SMS_PER_PHONE_PER_HOUR` | Codes envoyés par numéro et par heure | non | `5` |
| `AUTH_SMS_PER_IP_PER_HOUR` | Codes envoyés par adresse IP et par heure | non | `30` |
| `AUTH_FAILED_LOGINS_PER_IP_PER_HOUR` | Codes refusés par adresse IP et par heure | non | `30` |
| `AUTH_TEST_ACCOUNT_ENABLED` | `true` : active le compte de démonstration (jamais en production) | non | désactivé |
| `AUTH_TEST_ACCOUNT`, `AUTH_TEST_CODE` | Numéro et code fixes du compte de démonstration, créé administrateur | si activé | |
| `LOG_FORMAT` | `json` ou `text` | non | `json` (binaire de production), `text` (développement) |

Le site lit à la construction `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TILES_URL` (où le serveur Next relaie `/api` et
`/tiles`) et `NEXT_PUBLIC_MAPTILER_KEY` (fond de carte ; vide : fond neutre).

### Notifications Web Push

Générer une paire de clés VAPID (à faire une fois ; changer de clés désabonne tous les appareils) :

```bash
openssl ecparam -name prime256v1 -genkey -noout -out vapid.pem
echo "VAPID_PRIVATE_KEY=$(openssl ec -in vapid.pem -outform DER 2>/dev/null | tail -c +8 | head -c 32 | base64 | tr '/+' '_-' | tr -d '=\n')"
echo "VAPID_PUBLIC_KEY=$(openssl ec -in vapid.pem -pubout -outform DER 2>/dev/null | tail -c 65 | base64 | tr '/+' '_-' | tr -d '=\n')"
rm vapid.pem
```

Au démarrage, l'API refuse une clé publique qui ne correspond pas à la clé privée.

### Administrateurs

Le droit administrateur est la colonne `is_admin` de la table `"user"`. Il se donne et se retire en base, et
prend effet à la requête suivante :

```sql
UPDATE "user" SET is_admin = true WHERE phone = '+33612345678';
```

## Mise en production

Rien n'est déployé automatiquement. `deploy/production.yml` décrit la base, l'API, Martin, le site, et en
option OSRM et une sauvegarde quotidienne ; `deploy/production.env.example` documente ses variables.

```bash
cd deploy
cp production.env.example .env              # remplir : domaine, mot de passe de la base, secret, clé SMS
docker compose -f production.yml --env-file .env up -d --build
```

- Aucun port n'est publié sur l'hôte ; la base n'est joignable que des autres services.
- Traefik (réseau externe `TRAEFIK_NETWORK`) envoie `/api` à l'API, `/tiles` à Martin, le reste au site.
  L'API doit être atteinte directement par le reverse proxy : c'est lui qui lui donne l'adresse du client,
  dont dépend la limite de débit. Le serveur Next, lui, relaie l'en-tête `X-Forwarded-For` sans le compléter.
- `GET /api/health` répond 200 quand la base est joignable et les migrations appliquées, 503 sinon, et indique
  si OSRM répond. Les images ont un contrôle de santé intégré.
- La sauvegarde du profil `backup` écrit sur le même serveur : prévoir une copie ailleurs.

## Ancienne version

`back/`, `app/`, `common/`, le `Dockerfile` de la racine, `deploy/liane.yml`, `dev.yml`, `e2e.yml`, `test.yml`,
`website.yml`, `osm.yml`, `deploy/liane`, `deploy/utils.sh` et les workflows `.github/` servent l'ancienne pile
(.NET, MongoDB, React Native). La réécriture n'en dépend pas. Ils sont conservés tant que leur retrait n'est pas
décidé.
