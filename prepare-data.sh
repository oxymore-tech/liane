#!/usr/bin/env bash

wget -P data -N http://download.geofabrik.de/europe/france/midi-pyrenees-latest.osm.pbf
wget -P data -N http://download.geofabrik.de/europe/france/languedoc-roussillon-latest.osm.pbf

docker run -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/languedoc-roussillon-latest.osm.pbf
docker run -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-partition /data/languedoc-roussillon-latest.osrm
docker run -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-customize /data/languedoc-roussillon-latest.osrm