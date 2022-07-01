#!/usr/bin/env bash
set -e

LIANE_HOME=$(cd "$(dirname "$0")/.." || exit;pwd)

source "${LIANE_HOME}/deploy/utils.sh"

PROJECT=$(get_project)

docker compose -p "${PROJECT}" down