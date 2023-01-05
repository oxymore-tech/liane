
function init {
  init_db "$(get_project)-mongo-1" "${MONGO_USERNAME}" "${MONGO_PASSWORD}" "${LIANE_HOME}/deploy/db"
}

function dump {
  docker compose -f "${LIANE_HOME}/liane.yml" -p liane exec -T mongo mongodump --archive --gzip -u "${MONGO_USERNAME}" -p "${MONGO_PASSWORD}"
}

function start {
  create_osm_network
  docker compose -f "${LIANE_HOME}/deploy/osm.yml" -p "osm" up -d
  PROJECT=$(get_project)
  DOMAIN=$(get_domain)
  export PROJECT
  export DOMAIN
  docker compose -f "${LIANE_HOME}/deploy/liane.yml" -p "${PROJECT}" up -d --build --remove-orphans
}

function stop {
  docker compose -p "$(get_project)" down
}

function get_domain() {
  local project
  
  project=$(get_project)
  if [[ "${project}" = "liane" ]]; then
    echo "liane.app"
  else
    echo "dev.liane.app"
  fi
}

function get_project() {
  if [[ -z "${LIANE_HOME}" ]]; then
    echo "LIANE_HOME environment variable is not defined"
    exit 1
  fi

  local project
  project="$(basename "${LIANE_HOME}")"
  if [[ "${project}" =~ ^liane(-(dev))?$ ]]; then
    echo "${project}"
  else
    echo "Project should begin with 'liane' or 'liane-XXX' : ${project}"
    exit 1
  fi
}

function create_osm_network() {
  exist=$(docker network ls | grep -c osm || true)
  if [[ exist -eq 0 ]]; then
    docker network create osm
  else
    printf "osm network exists\n"
    printf "Skipping creation...\n"
  fi
}

function init_db() {
  local mongo_container=${1}
  local mongo_user=${2}
  local mongo_password=${3}
  local db_init_dir=${4}
    
  docker exec -i "${mongo_container}" mongo -u "${mongo_user}" -p "${mongo_password}" < "${db_init_dir}/mongo-init.js" 
}

function init_osrm() {
  sudo mkdir -p /data/osm
  local country="france-latest"
  wget -P /data/osm -N "http://download.geofabrik.de/europe/${country}.osm.pbf"
  docker run -t -v "/data/osm:/data" docker.synergee.com/library/nominatim:3.5 sh /app/init.sh "/data/${country}.osm.pbf" nominatim 4:x
  
  docker run -t -v "/data/osm:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua "/data/${country}.osm.pbf"
  docker run -t -v "/data/osm:/data" osrm/osrm-backend osrm-partition "/data/${country}.osrm"
  docker run -t -v "/data/osm:/data" osrm/osrm-backend osrm-customize "/data/${country}.osrm"
}
