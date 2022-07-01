#!/usr/bin/env bash

LIANE_HOME=$(cd "$(dirname "$0")/.." || exit;pwd)

source "${LIANE_HOME}/deploy/utils.sh"

PROJECT=$(getProject)

createOsmNetwork

docker-compose -f "${LIANE_HOME}/osm.yml" -p "osm" up -d

docker-compose -f "${LIANE_HOME}/liane.yml" -p "${PROJECT}" up -d $*
