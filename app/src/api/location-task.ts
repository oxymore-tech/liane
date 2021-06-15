import * as Location from "expo-location";
import { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { TaskManagerTaskBody } from "expo-task-manager";
import { logLocation } from "@/api/client";
import { storeLocation } from "@/api/location-storage";
import { LocationPermissionLevel, UserLocation } from "@/api/index";
import * as Device from "expo-device";

const LOCATION_TASK_NAME = "location-task";
const LOCATION_TASK_CHECK = "LOCATION_TASK_CHECK";
const LOCATION_TASK_FOLLOW = "LOCATION_TASK_FOLLOW";

/**
 * Décrivons rapidemment l'algorithme que nous allons tenter de mettre en place :
 * Cela fonctionne avec deux tâches afin d'obtenir un niveau de précision élevé tout en évitant de consommer beaucoup de
 * batterie et de données :
 *  -> Une première tâche vérifie toutes les 5 minutes si la personne s'est déplacée en sauvegardant la dernière donnée (en supprimant les précédentes ?)
 *  -> Si la personne s'est déplacée : 500m ? 1km ? alors une autre tâche est lancée pour suivre la totalité du trajet
 *  -> Cette seconde tâche s'arrête si la personne ne bouge plus pendant 5 minutes
 * On pourrait envoyer les données une fois que le trajet est détecté comme terminé par l'application
 *
 * Données à ajouter :
 * - niveau de permission
 * - modèle du téléphone
 */

const isApple = Device.brand === "Apple";

type LocationInformation = {
  location: UserLocation;
  permissionLevel: LocationPermissionLevel;
  isApple: boolean;
};

const previousLocation = undefined;

TaskManager.defineTask(LOCATION_TASK_CHECK, async ({ data, error }) => {

});

TaskManager.defineTask(LOCATION_TASK_FOLLOW, async (data: TaskManagerTaskBody) => {

});

export async function sendLocations(newLocations: LocationObject[] = []) {
  const locations = await storeLocation(newLocations);
  await logLocation(locations.map((l) => ({
    timestamp: l.timestamp,
    latitude: l.coords.latitude,
    longitude: l.coords.longitude,
    accuracy: l.coords.accuracy,
    speed: l.coords.speed
  })));
}

/**
 * We define a task function with the help of the "defineTask" function.
 * This "task" function will be invoked when the task "TASK_LOCATION_NAME"
 * is executed.
 * Here we simply send the new locations data to the server.
 */
export function listenLocationTask() {
  TaskManager.defineTask(LOCATION_TASK_NAME, async (result: TaskManagerTaskBody) => {
    try {
      console.log("Nouvelle localisation : ", result);
      const { locations } = result.data as { locations:LocationObject[] };
      if (locations.length > 0) {
        await sendLocations(locations);
      }
    } catch (err) {
      console.log("Erreur : ", err);
    }
  });
}

/**
 * Execute a task that will track the user position.
 */
export async function startLocationTask(permissionLevel: LocationPermissionLevel) {
  try {
    if (permissionLevel === LocationPermissionLevel.ALWAYS) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        distanceInterval: 50,
        // Android options
        timeInterval: 60000,
        // iOS options
        pausesUpdatesAutomatically: true,
        activityType: Location.ActivityType.AutomotiveNavigation

      });
    } else if (permissionLevel === LocationPermissionLevel.ACTIVE) {

    } else {
      console.log("Could not start tracking task as permission levels were not met.");
    }
  } catch (e) {
    console.log(`Could not start tracking task : ${e}`);
  }
}