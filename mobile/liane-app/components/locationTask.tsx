import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { sendLocation } from './apiRequest';
import {storeLocation, getLocations, deleteLocations } from './locationStorage';
import { LocationObject } from 'expo-location';

// the name of our task
const TASK_LOCATION = 'TASK_LOCATION';

/**
 * function that try to send all the new locations to the server
 * and delete them if the sending was successful.
 * Otherwise we store them and will try to send them later.
 * @param locations : the data to send.
 * @param stored : indicates if the data is already stored in AsynStorage.
 */
function sendLocations(locations : LocationObject[], stored = false) {
  return locations.forEach(location => {
    sendLocation(location).then(result => {
      if(result == false && stored == false) {
        storeLocation(location);
      } else if(result == true && stored == true) {
        deleteLocations([location.timestamp.toString()]);
      }
    }).catch(e => {
      console.log('Erreur : ', e);
      if (stored == false) storeLocation(location);
    });
  });
}

/**
 * We define a task function with the help of the "defineTask" function.
 * This "task" function will be invoked when the task "TASK_LOCATION"
 * is executed.
 * Here we simply send the new locations data to the server.
 * @param result : new location data
 * 
 */
export function initializeLocationTask() {
  TaskManager.defineTask(TASK_LOCATION, async function (result: any) {
    try {
      console.log('Nouvelle localisation : ', result);
      let locations : LocationObject[] = result.data.locations;
      if(locations.length > 0) {
        sendLocations(locations);
      }
      getLocations().then(locations => sendLocations(locations, true)).catch(e => console.log('Erreur : ', e));
      return;
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
    const { status } = await Location.requestPermissionsAsync();
    if (status === 'granted') {
      await Location.startLocationUpdatesAsync(TASK_LOCATION, {
        // distanceInterval: 50,
        // timeInterval : 30000 
        pausesUpdatesAutomatically: true,
        activityType: Location.ActivityType.AutomotiveNavigation
      });
      console.log("Task registered")
    }
  } catch (err) {
    console.log("Task Register failed:", err)
  }
}