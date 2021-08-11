#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

source .env

docker exec -i liane_redis_1 redis-cli --pass "${REDIS_PASSWORD}" < "${BASEDIR}/administrators.txt"
