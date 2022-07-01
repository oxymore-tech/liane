#!/usr/bin/env bash

sudo mkdir -p /data/osm

function download() {
    local country=$1
    wget -P /data/osm -N "http://download.geofabrik.de/europe/${country}.osm.pbf"
#    wget -P /data/osm -N http://download.geofabrik.de/europe/france/midi-pyrenees-latest.osm.pbf
#    wget -P /data/osm -N http://download.geofabrik.de/europe/france/languedoc-roussillon-latest.osm.pbf
#    wget -P /data/osm -N http://download.geofabrik.de/europe/france/auvergne-latest.osm.pbf
#    wget -P /data/osm -N http://download.geofabrik.de/europe/france/rhone-alpes-latest.osm.pbf
}

function merge() {
    if [[ ! -f /data/osm/all.osm.pbf ]]
    then
        docker run -t -v "/data/osm:/data" yagajs/osmosis osmosis \
          --read-pbf /data/midi-pyrenees-latest.osm.pbf \
          --read-pbf /data/languedoc-roussillon-latest.osm.pbf \
          --read-pbf /data/auvergne-latest.osm.pbf \
          --read-pbf /data/rhone-alpes-latest.osm.pbf \
          --merge --write-pbf /data/all.osm.pbf
    fi;
}

function prepare() {
    local country=$1

    docker run -t -v "/data/osm:/data" docker.synergee.com/library/nominatim:3.5 sh /app/init.sh "/data/${country}.osm.pbf" nominatim 4:x

    docker run -t -v "/data/osm:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua "/data/${country}.osm.pbf"
    docker run -t -v "/data/osm:/data" osrm/osrm-backend osrm-partition "/data/${country}.osrm"
    docker run -t -v "/data/osm:/data" osrm/osrm-backend osrm-customize "/data/${country}.osrm"
}

download france-latest

#merge

prepare france-latest