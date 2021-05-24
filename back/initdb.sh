#!/usr/bin/env bash

BASEDIR=$(dirname "$0")
user=${MONGO_USER:-mongoadmin}
password=${MONGO_PASSWORD:-secret}
container=${MONGO_CONTAINER:-mongo}

docker exec -i "${container}" mongo -u "${user}" -p "${password}" << EOF
use liane;

db.trip.createIndex( { "UserId": 1, "StartTime": 1 }, { unique: true } );

EOF

docker exec -i redis_redis_1 redis-cli --pipe < "${BASEDIR}/../deploy/redis-data.txt"