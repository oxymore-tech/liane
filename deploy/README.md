## Available Scripts

In the project directory, you can run:

### prepare-data.sh

This script downloads and merges data for OSRM and Nominatim server.

You need to run it with 'sudo' so it can access '/data' folder and download needed files there.

### start.sh

This script runs docker with the 'docker-compose.yml' file as config.
It enables OSRM and Nominatim for the front.

### stop.sh

Use this script to shut down the OSRM and Nominatim services.