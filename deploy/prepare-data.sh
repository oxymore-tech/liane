#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

mkdir -p /data/liane/osm

function download() {
    wget -P data -N http://download.geofabrik.de/europe/france/midi-pyrenees-latest.osm.pbf
    wget -P data -N http://download.geofabrik.de/europe/france/languedoc-roussillon-latest.osm.pbf
}

function merge() {
    if [ ! -f data/all.osm.pbf ]
    then
        docker run -t -v "/data/liane/osm:/data" yagajs/osmosis osmosis --read-pbf /data/midi-pyrenees-latest.osm.pbf --read-pbf /data/languedoc-roussillon-latest.osm.pbf --merge --write-pbf /data/all.osm.pbf
    fi;
}

function prepare() {
    local country=$1

    docker run -t -v "/data/liane/osm:/data" docker.synergee.com/library/nominatim:3.5 sh /app/init.sh /data/${country}.osm.pbf postgresdata 4:x

    docker run -t -v "/data/liane/osm:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/${country}.osm.pbf
    docker run -t -v "/data/liane/osm:/data" osrm/osrm-backend osrm-partition /data/${country}.osrm
    docker run -t -v "/data/liane/osm:/data" osrm/osrm-backend osrm-customize /data/${country}.osrm
}

download

merge

prepare all