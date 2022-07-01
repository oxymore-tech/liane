#!/usr/bin/env bash
set -e

LIANE_HOME=$(cd "$(dirname "$0")/.." || exit;pwd)

source "${LIANE_HOME}/deploy/utils.sh"

PROJECT=$(getProject)

docker-compose -f "${LIANE_HOME}/deploy/docker-compose.yml" -p "${PROJECT}" down