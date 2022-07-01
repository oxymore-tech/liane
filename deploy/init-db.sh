#!/usr/bin/env bash
set -e

LIANE_HOME=$(cd "$(dirname "$0")/.." || exit;pwd)

source "${LIANE_HOME}/deploy/utils.sh"

PROJECT=$(get_project)

source .env

init_db "${PROJECT}_redis_1" "${REDIS_PASSWORD}" "${PROJECT}_mongo_1" "${MONGO_USER}" "${MONGO_PASSWORD}" "${LIANE_HOME}/deploy/db"