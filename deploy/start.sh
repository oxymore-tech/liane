#!/usr/bin/env bash
set -e

LIANE_HOME=$(cd "$(dirname "$0")/.." || exit;pwd)

source "${LIANE_HOME}/deploy/utils.sh"

createOsmNetwork

docker compose -f "${LIANE_HOME}/deploy/osm.yml" -p "osm" up -d

PROJECT=$(getProject)

export PROJECT

docker compose -f "${LIANE_HOME}/deploy/liane.yml" -p "${PROJECT}" up -d --build --remove-orphans
