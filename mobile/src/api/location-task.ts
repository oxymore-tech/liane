import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { sendLocation } from './client';
import { deleteLocations, storeLocation } from './location-storage';

const TASK_LOCATION_NAME = 'TASK_LOCATION';

async function sendLocations(locations: LocationObject[], stored = false) {

  for (const location of locations) {
    try {
      const sent = await sendLocation(location);
      if (!sent && !stored) {
        await storeLocation(location);
      } else if (sent && stored) {
        await deleteLocations([location.timestamp.toString()]);
      }
    } catch (e) {
      console.log('Erreur : ', e);
      if (!stored) {
        await storeLocation(location);
      }
    }
  }

}

/**
 * We define a task function with the help of the "defineTask" function.
 * This "task" function will be invoked when the task "TASK_LOCATION_NAME"
 * is executed.
 * Here we simply send the new locations data to the server.
 */
export function listenLocationTask() {
  TaskManager.defineTask(TASK_LOCATION_NAME, async function (result: any) {
    try {
      console.log('Nouvelle localisation : ', result);
      const locations: LocationObject[] = result.data.locations;
      if (locations.length > 0) {
        await sendLocations(locations);
      }
    } catch (err) {
      console.log('Erreur : ', err);
      return;
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
    console.log("Task Register failed:", err)
  }
}