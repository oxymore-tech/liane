import * as Location from "expo-location";
import { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { TaskManagerTaskBody } from "expo-task-manager";
import { logLocation } from "@/api/client";
import { storeLocation } from "@/api/location-storage";

const TASK_LOCATION_NAME = "TASK_LOCATION";

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
  TaskManager.defineTask(TASK_LOCATION_NAME, async (result: TaskManagerTaskBody) => {
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
 * the function executed in the background which look at the
 * current position of the smartphone.
 */
export async function registerLocationTask() {
  try {
    await Location.startLocationUpdatesAsync(TASK_LOCATION_NAME, {
      // distanceInterval: 50,
      // timeInterval : 30000
      pausesUpdatesAutomatically: true,
      activityType: Location.ActivityType.AutomotiveNavigation
    });
  } catch (err) {
    console.log("Task Register failed : ", err);
  }
}