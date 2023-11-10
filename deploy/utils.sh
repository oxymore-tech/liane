
function source_env() {  
  if [ ! -f "${LIANE_HOME}/deploy/.env" ]; then
    echo "${LIANE_HOME}/deploy/.env does not exist."
    exit 1;
  fi
  
  source "${LIANE_HOME}/deploy/.env"
}

function test_compose {
  TEST_PROJECT=$(get_test_project)
  
  export TEST_PROJECT
  
  docker compose -f "${LIANE_HOME}/deploy/test.yml" -p "${TEST_PROJECT}" "${@}"
}

function e2e_compose {
  TEST_PROJECT="e2e-$(get_project)"
  
  export TEST_PROJECT
  
  docker compose -f "${LIANE_HOME}/deploy/e2e.yml" -p "${TEST_PROJECT}" "${@}"
}

function liane_compose {
  PROJECT=$(get_project)
  DOMAIN=$(get_domain)
  APP_ENV=$(get_app_env)
  APP_VERSION=$(get_app_version)
  MONGO_HOST_PORT=$(get_mongo_host_port)
  POSTGIS_HOST_PORT=$(get_postgis_host_port)
  
  export PROJECT
  export DOMAIN
  export APP_ENV
  export APP_VERSION
  export MONGO_HOST_PORT
  export POSTGIS_HOST_PORT
  
  docker compose -f "${LIANE_HOME}/deploy/liane.yml" -p "${PROJECT}" "${@}"
}

function run_it_tests {  
  test_compose build
  test_compose run test
  test_compose down
}

function run_e2e_tests {  
  e2e_compose build
  e2e_compose run test
  e2e_compose down
}

function dump {
  liane_compose exec -T mongo mongodump --archive --gzip -u "${MONGO_USERNAME}" -p "${MONGO_PASSWORD}"
}

function dump_pg {
  liane_compose exec -T postgis pg_dump --clean --username="${MONGO_USERNAME}" "liane"
}

function start {
  create_osm_network
  docker compose -f "${LIANE_HOME}/deploy/osm.yml" -p "osm" up -d
  liane_compose up -d --build --remove-orphans
}

function stop {
  liane_compose down
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

function get_app_env() {
  local project
  
  project=$(get_project)
  if [[ "${project}" = "liane" ]]; then
    echo "production"
  else
    echo "dev"
  fi
}

function get_app_version() {
  git -C "${LIANE_HOME}" describe
}

function get_test_project() {  
  echo "it-$(get_project)"
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

function get_postgis_host_port() {
  local project
  
  project=$(get_project)
  if [[ "${project}" = "liane" ]]; then
    echo "5432"
  else
    echo "5431"
  fi
}

function get_mongo_host_port() {
  local project
  
  project=$(get_project)
  if [[ "${project}" = "liane" ]]; then
    echo "27017"
  else
    echo "27016"
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

function init_osrm() {
  sudo mkdir -p /data/osm
  local country="france-latest"
  wget -P /data/osm -N "http://download.geofabrik.de/europe/${country}.osm.pbf"
  docker run -t -v "/data/osm:/data" docker.synergee.com/library/nominatim:3.5 sh /app/init.sh "/data/${country}.osm.pbf" nominatim 4:x
  
  docker run -t -v "/data/osm:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua "/data/${country}.osm.pbf"
  docker run -t -v "/data/osm:/data" osrm/osrm-backend osrm-partition "/data/${country}.osrm"
  docker run -t -v "/data/osm:/data" osrm/osrm-backend osrm-customize "/data/${country}.osrm"
}

