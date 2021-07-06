#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

source ${BASEDIR}/.env

docker-compose -f ${BASEDIR}/docker-compose.yml -p liane exec mongo mongodump --archive --gzip -u ${MONGO_USERNAME} -p ${MONGO_PASSWORD} $*