#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

cat ${BASEDIR}/../deploy/redis-data.txt | docker exec -i redis_redis_1 redis-cli --pipe