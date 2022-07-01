#!/usr/bin/env bash
set -e

LIANE_HOME=$(cd "$(dirname "$0")/.." || exit;pwd)

source "${LIANE_HOME}/deploy/utils.sh"

PROJECT=$(getProject)

createOsmNetwork

docker-compose -f "${LIANE_HOME}/deploy/osm.yml" -p "osm" up -d

docker-compose -f "${LIANE_HOME}/deploy/liane.yml" -p "${PROJECT}" up -d $*
