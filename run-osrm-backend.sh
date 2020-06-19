#!/usr/bin/env bash

docker run -d -p 5000:5000 -v "${PWD}/data:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/languedoc-roussillon-latest.osrm