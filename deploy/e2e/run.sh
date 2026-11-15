#!/bin/bash
# Parcours dans Chromium sans tête (Playwright), en largeur mobile.
# Prérequis : conteneurs liane-dev-{postgres,api,martin,web} démarrés et jeu de démonstration chargé
#. Les codes SMS sont lus dans les journaux de l'API, puis transmis au navigateur
# par un fichier du dossier de travail.
# JOURNEY choisit le parcours : journey.mjs (lianes, par défaut) ou journey-trips.mjs (trajets, messages).
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${E2E_WORK:-/tmp/liane-e2e}
CAPTURES=${CAPTURES:-$WORK/captures}
JOURNEY=${JOURNEY:-journey.mjs}
IMAGE=mcr.microsoft.com/playwright:v1.56.1-noble
PW="docker run --rm --user 1001:1001 --cpus 2 --memory 2g -e HOME=/tmp -v $WORK:/work -w /work"

mkdir -p "$WORK" "$CAPTURES"
cp "$HERE/$JOURNEY" "$WORK/$JOURNEY"
rm -f "$WORK/need-code.txt" "$WORK/code.txt"
if [ ! -d "$WORK/node_modules/playwright" ]; then
  sg docker -c "$PW --name liane-playwright-install $IMAGE npm install --no-audit --no-fund playwright@1.56.1" || exit 1
fi

(
  while true; do
    if [ -f "$WORK/need-code.txt" ]; then
      sleep 1
      sg docker -c "docker logs liane-dev-api 2>&1" | grep 'code for' | tail -1 | sed 's/.*: \([0-9]\{6\}\).*/\1/' > "$WORK/code.tmp"
      rm -f "$WORK/need-code.txt"
      mv "$WORK/code.tmp" "$WORK/code.txt"
    fi
    sleep 0.5
  done
) &
CODE_READER=$!
trap 'kill $CODE_READER 2>/dev/null' EXIT

# Le navigateur partage le réseau du conteneur web : il l'atteint par http://localhost:3000, une origine
# « sûre », sans quoi il n'y aurait ni géolocalisation ni service worker.
sg docker -c "$PW --name liane-playwright -e ONLY=${ONLY:-} --network container:liane-dev-web -v $CAPTURES:/captures $IMAGE node $JOURNEY"
