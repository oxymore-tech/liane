#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

docker-compose -f ${BASEDIR}/deploy/docker-compose.yml -p liane down