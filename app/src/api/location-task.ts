import * as Location from "expo-location";
import { LocationAccuracy, LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { logLocation } from "@/api/client";
import { LocationWithInformation, LocationPermissionLevel } from "@/api/index";
import * as Device from "expo-device";
import { AppState } from "react-native";

const LOCATION_BATCH_SIZE = 25;
const LOCATION_TASK_NAME: string = "LOCATION_TASK";
const LOCATION_TASK_OPTIONS = {
  accuracy: LocationAccuracy.High,
  distanceInterval: 250,
  // Notification options, the reliable way to get background task run properly
  foregroundService: {
    notificationTitle: "Localisation",
    notificationBody: "Service de suivi de trajet.",
    notificationColor: "#FF5B22"
  },
  // Android options
  timeInterval: 2.5 * 60 * 1000,
  // iOS options
  pausesUpdatesAutomatically: true,
  activityType: Location.ActivityType.AutomotiveNavigation
};

const isApple: boolean = Device.brand === "Apple";
const locationsAccumulator: Array<LocationWithInformation> = [];
let lastLocationPermissionLevel: LocationPermissionLevel = LocationPermissionLevel.NEVER;

/**
 * Add a location to the list.
 */
async function addLocation(location: LocationWithInformation) {
  locationsAccumulator.push(location);

  if (locationsAccumulator.length >= LOCATION_BATCH_SIZE) {
    await sendLocations();
  }
}

/**
 * Send the registered locations to the server.
 */
export async function sendLocations() {
  await logLocation(locationsAccumulator);
  locationsAccumulator.length = 0;
}

/**
 * Execute a task that will track the user position.
 */
export async function startLocationTask(permissionLevel: LocationPermissionLevel) {
  try {
    // Stop a task that may have started previously
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("Previous location task stopped.");
    }

    lastLocationPermissionLevel = permissionLevel;

    // Start the task regarding the permission level
    if (permissionLevel === LocationPermissionLevel.ALWAYS || permissionLevel === LocationPermissionLevel.ACTIVE) {
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
  if (error) {
    console.log(`An error occured during the task ${LOCATION_TASK_NAME} : ${error}`);
    return;
  }

  // Iterate over every location received and choose the pertinent ones
  const { locations } = data as { locations: LocationObject[] };
  locations.forEach((l) => {
    addLocation({
      location: {
        timestamp: l.timestamp,
        latitude: l.coords.latitude,
        longitude: l.coords.longitude,
        accuracy: l.coords.accuracy,
        speed: l.coords.speed
      },
      permissionLevel: lastLocationPermissionLevel,
      isApple,
      foreground: AppState.currentState === "active"
    });
  });
});
