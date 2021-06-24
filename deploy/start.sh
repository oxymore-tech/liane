#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

docker-compose -f ${BASEDIR}/docker-compose.yml -p liane up -d $*
