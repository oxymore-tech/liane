#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

cat ${BASEDIR}/../deploy/redis-data.txt | redis-cli --pipe