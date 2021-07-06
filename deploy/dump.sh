#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

source .env

docker-compose -f ${BASEDIR}/docker-compose.yml -p liane exec mongo mongodump -u ${MONGO_USERNAME} -p ${MONGO_PASSWORD} $*