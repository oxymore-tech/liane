#!/usr/bin/env bash

SCRIPTPATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit ; pwd -P )"

function dump_on_local {
    ssh gjini.co "/home/ubuntu/liane/deploy/dump.sh" | docker exec -i mongo mongorestore --archive --gzip -u mongoadmin -p secret
}

function mongo_start {
    mongo_stop
    docker run -d --name mongo \
        -e MONGO_INITDB_ROOT_USERNAME=mongoadmin \
        -e MONGO_INITDB_ROOT_PASSWORD=secret \
        -p 27017:27017 \
        -v "${SCRIPTPATH}/data/mongo:/data/db" \
        --restart unless-stopped mongo:4.4.4
}

function mongo_stop {
    docker rm -f mongo 2> /dev/null
}

function mongo_purge {
    mongo_stop
    sudo rm -Rf "${SCRIPTPATH}/data/mongo"
    mongo_start
}

function redis_start {
    redis_stop
    docker run -d --name redis \
        -p 6379:6379 \
        -v "${SCRIPTPATH}/data/redis:/var/lib/redis" \
        --restart unless-stopped redis:6.0.3
}

function redis_stop {
    docker rm -f redis 2> /dev/null
}

function redis_purge {
    redis_stop
    sudo rm -Rf "${SCRIPTPATH}/data/redis"
    redis_start
}

function stop {
  mongo_stop
  redis_stop
}

function start {
  dotnet run --project "${SCRIPTPATH}/src/Liane/Liane.Web/Liane.Web.csproj"
}

function init {
  redis_purge
  mongo_purge
  sleep 3
  source "${SCRIPTPATH}/../deploy/utils.sh"  
  init_db "redis" "${REDIS_PASSWORD}" "mongo" "mongoadmin" "secret" "${SCRIPTPATH}/../deploy/db"
}

case "$1" in
 stop)
  stop
  ;;
 start)
  start
  ;;
 init)
  init
  ;;
 dump_on_local)
  dump_on_local
  ;;
 *)
  # else
  echo "Usage: (init|start|stop|dump_on_local)"
  ;;
esac
