
function getProject() {
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

function createOsmNetwork() {
  exist=$(docker network ls | grep -c osm || true)
  if [[ exist -eq 0 ]]; then
    docker network create \
        --driver=overlay \
        --internal=false \
        --subnet=10.15.0.0/16 \
        osm
  else
    printf "osm network exists\n"
    printf "Skipping creation...\n"
  fi
}
