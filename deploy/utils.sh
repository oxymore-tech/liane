
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
  local redis_container=${1}
  local redis_password=${2}
  local mongo_container=${3}
  local mongo_user=${4}
  local mongo_password=${5}
  local db_init_dir=${6}
    
  docker exec -i "${redis_container}" redis-cli --pass "${redis_password}" < "${db_init_dir}/administrators.txt"  
  docker exec -i "${mongo_container}" mongo -u "${mongo_user}" -p "${mongo_password}" < "${db_init_dir}/mongo-init.js" 
}