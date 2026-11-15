#!/bin/bash
# Jeu de démonstration, suite de seed-lianes.mjs : des membres, des messages et des trajets
# (à venir, terminé avec preuve, annulé) sur la liane Florac – Mende.
# Les comptes de démonstration se connectent par le parcours réel : le code SMS est lu dans la base
# (aucun SMS n'est envoyé) et transmis au script par un fichier du dossier de travail.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${SEED_WORK:-/tmp/liane-seed}
API=${API:-http://liane-dev-api:5000/api}

mkdir -p "$WORK"
rm -f "$WORK/need-code.txt" "$WORK/code.txt"

(
  while true; do
    if [ -f "$WORK/need-code.txt" ]; then
      phone=$(cat "$WORK/need-code.txt")
      echo "SELECT code FROM sms_code WHERE phone = '$phone'" \
        | sg docker -c "docker exec -i liane-dev-postgres psql -U liane -d liane -h 127.0.0.1 -At" > "$WORK/code.tmp"
      rm -f "$WORK/need-code.txt"
      mv "$WORK/code.tmp" "$WORK/code.txt"
    fi
    sleep 0.3
  done
) &
CODE_READER=$!
trap 'kill $CODE_READER 2>/dev/null' EXIT

sg docker -c "docker run --rm --name liane-seed --network liane-dev --user 1001:1001 -e API=$API -v $HERE:/demo:ro -v $WORK:/work node:24-bookworm-slim node /demo/seed-trips.mjs"
