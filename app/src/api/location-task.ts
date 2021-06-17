import * as Location from "expo-location";
import { LocationAccuracy, LocationObject, LocationTaskOptions } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { logLocation } from "@/api/client";
import { LocationPermissionLevel, UserLocation } from "@/api/index";
import * as Device from "expo-device";
import { AppState } from "react-native";
import { scopedTranslate } from "@/api/i18n";

const t = scopedTranslate("LocationTaskNotification");

// Time which we consider is the minimum to separate two trips
const TRIP_SEPARATING_TIME: number = 1000 * 60 * 7.5;

// Task name
const LOCATION_TASK_NAME: string = "LOCATION_TASK";

// Task options
const LOCATION_TASK_OPTIONS: LocationTaskOptions = {
  accuracy: LocationAccuracy.High,
  distanceInterval: 100,
  // Notification options, the reliable way to get background task run properly
  foregroundService: {
    notificationTitle: t("Titre"),
    notificationBody: t("Description"),
    notificationColor: "#FF5B22"
  },
  // Android options
  timeInterval: 60 * 1000,
  // iOS options
  pausesUpdatesAutomatically: true,
  activityType: Location.ActivityType.AutomotiveNavigation
};

// Is the device an apple device
const isApple: boolean = Device.brand === "Apple";

// List of locations creating a trip
const trip: Array<UserLocation> = [];

// Last known permission level
let locationPermissionLevel: LocationPermissionLevel = LocationPermissionLevel.NEVER;

// Last time we received locations
let lastLocationFetchTime: number = 0;

/**
 * Send the registered locations to the server and clean
 */
export async function sendTrip() {
  await logLocation(trip);
  trip.length = 0;
}

/**
 * Execute a task that will track the user position.
 */
export async function startLocationTask(permissionLevel: LocationPermissionLevel) {
  try {
    // Stop a task that may have started previously
    const hasStarted: boolean = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("Previous location task stopped.");
    }

    locationPermissionLevel = permissionLevel;

    // Start the task regarding the permission level
    if (permissionLevel === LocationPermissionLevel.ALWAYS || permissionLevel === LocationPermissionLevel.ACTIVE) {
      console.log("Location task started.");
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, LOCATION_TASK_OPTIONS);
      console.log("Location task started.");
    } else {
      console.log("Could not start tracking task as permission levels were not met.");
    }
  } catch (e) {
    console.log(`Could not start tracking task : ${e}`);
  }
}

/**
 * Register the task callback.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  // Handle errors
  if (error) {
    console.log(`An error occured during the task ${LOCATION_TASK_NAME} : ${error}`);
    return;
  }

  // Check whether the detected locations belongs to a new trip
  const newLocationFetchTime: number = Date.now();

  if (lastLocationFetchTime !== 0 && newLocationFetchTime - lastLocationFetchTime > TRIP_SEPARATING_TIME) {
    lastLocationFetchTime = newLocationFetchTime; // Needs to be updated before performing a long task
    // await sendTrip();
    console.log("New trip sent.");
  } else {
    lastLocationFetchTime = newLocationFetchTime;
  }

  console.log(`New location received at : ${lastLocationFetchTime}`);

  // Iterate over every location received and choose the pertinent ones
  const { locations } = data as { locations: LocationObject[] };

  locations.forEach((l) => {
    trip.push({
      timestamp: l.timestamp,
      latitude: l.coords.latitude,
      longitude: l.coords.longitude,
      accuracy: l.coords.accuracy,
      speed: l.coords.speed,
      permissionLevel: locationPermissionLevel,
      isApple,
      foreground: AppState.currentState === "active"
    });
  });
});
