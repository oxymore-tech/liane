import csv
import sys

# This file can be called with any french region name
# and will generate a text file with queries to add each of
# its cities as a rallying point.

MAX_PEOPLE = 50000
IN_FILE_PATH = "./villes_france.csv"
OUT_FILE_PATH = "./{}.temprp.txt"
QUERY_FORMAT = "GEOADD rallying_point {} {} {} \n"
REGIONS = {
    "auvergne-rhone-alpes": ["1", "2", "7", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
    "bourgogne-franche-comte": ["21", "25", "39", "58", "70", "71", "89", "90"],
    "bretagne": ["22", "29", "35", "56"],
    "centre-val-de-loire": ["18", "28", "36", "37", "41", "45"],
    "corse": ["2A", "2B"],
    "grand-est": ["8", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
    "hauts-de-france": ["2", "59", "60", "62", "80"],
    "ile-de-france": ["75", "77", "78", "91", "92", "93", "94", "95"],
    "normandie": ["14", "27", "50", "61", "76"],
    "nouvelle-aquitaine": ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
    "occitanie": ["9", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"],
    "pays-de-la-loire": ["44", "49", "53", "72", "85"],
    "provence-alpes-cote-dazur": ["4", "5", "6", "13", "83", "84"],
}


def is_city_valid(city, max_people, region):
    """
    Define the constraints to select a city.
    Return whether the city is valid and its extracted data.
    """

    dep = city[1]
    name = city[5].replace(" ", "_").replace("'", "")
    people = int(city[16])
    lat = float(city[19])
    long = float(city[20])

    return people <= max_people and dep in region, name, lat, long


def collect_cities(in_file, out_file, max_people, region):
    """
    Run through the file to collect valid cities.
    """

    for row in in_file:
        valid, name, lat, long = is_city_valid(row, max_people, region)

        if valid:
            out_file.write(QUERY_FORMAT.format(lat, long, name))


def main(region_name):
    region = REGIONS[region_name]

    with open(IN_FILE_PATH) as in_file:
        with open(OUT_FILE_PATH.format(region_name), "w") as out_file:
            reader = csv.reader(in_file)
            collect_cities(reader, out_file, MAX_PEOPLE, region)


if __name__ == "__main__":
    try:
        main(sys.argv[1])
    except KeyError:
        print("Region inconnue, regions disponibles : " + str(REGIONS.keys()))
    except IndexError:
        print("Utilisation incorrecte : python3 generate_rp.py [region]")
    # except TypeError:
    #     print("Le fichier utilisé comporte une erreur.")
