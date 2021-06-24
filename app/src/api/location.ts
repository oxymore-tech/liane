import * as Location from "expo-location";
import { LocationAccuracy, LocationObject, LocationTaskOptions } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { logLocation } from "@/api/client";
import { LocationPermissionLevel, UserLocation } from "@/api/index";
import * as Device from "expo-device";
import { AppState } from "react-native";
// import { scopedTranslate } from "@/api/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Translation variable
// const t = scopedTranslate("LocationTaskNotification");

// Storage keys
const TRIP_KEY = "@Trip";
const FETCH_TIME_KEY = "@Fetch_Time";

// Minimum size of a trip to send it
const MIN_TRIP_SIZE = 5;

// Time which we consider is the minimum to separate two trips
const TRIP_SEPARATING_TIME: number = 1000 * 60 * 5;

// Task name
const LOCATION_TASK_NAME: string = "LOCATION_TASK";

// Task options
const LOCATION_TASK_OPTIONS: LocationTaskOptions = {
  accuracy: LocationAccuracy.High,
  distanceInterval: 100,
  // Notification options, the (only) reliable way to get background task run properly
  foregroundService: {
    notificationTitle: "Localisation",
    notificationBody: "Service de suivi de trajet.",
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

// Last known permission level
let locationPermissionLevel: LocationPermissionLevel = LocationPermissionLevel.NEVER;

/**
 * Get the current trip.
 */
async function getTrip(): Promise<UserLocation[]> {
  let trip: UserLocation[] = [];

  try {
    const result = await AsyncStorage.getItem(TRIP_KEY);

    if (result) {
      trip = JSON.parse(result);
    }
  } catch (e) {
    console.log(`An error occured while fetching data : ${e}`);
  }

  return trip;
}

/**
 * Set the current trip.
 */
async function setTrip(locations: UserLocation[]) {
  try {
    await AsyncStorage.setItem(TRIP_KEY, JSON.stringify(locations));
  } catch (e) {
    console.log(`An error occured while setting data : ${e}`);
  }
}

/**
 * Get the last time we received a location.
 */
async function getLastLocationFetchTime(): Promise<number> {
  let lastLocationFetchTime: number = 0;

  try {
    const result = await AsyncStorage.getItem(FETCH_TIME_KEY);

    if (result) {
      lastLocationFetchTime = parseInt(result, 10);
    }
  } catch (e) {
    console.log(`An error occured while fetching data : ${e}`);
  }

  return lastLocationFetchTime;
}

/**
 * Set the last time we received a location.
 */
async function setLastLocationFetchTime(lastLocationFetchTime: number) {
  try {
    await AsyncStorage.setItem(FETCH_TIME_KEY, String(lastLocationFetchTime));
  } catch (e) {
    console.log(`An error occured while setting data : ${e}`);
  }
}

/**
 * Send the registered locations to the server and clean
 */
export async function sendTrip() {
  const locations: UserLocation[] = await getTrip(); // Get the trip

  if (locations.length > MIN_TRIP_SIZE) {
    await logLocation(locations); // Send the trip
    console.log("Trip sent and flushed.");
  } else {
    console.log("Trip was to short in order to be sent. Trip flushed.");
  }

  await setTrip([]); // Reset the trip
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
  const lastLocationFetchTime: number = await getLastLocationFetchTime();

  if (lastLocationFetchTime !== 0 && newLocationFetchTime - lastLocationFetchTime > TRIP_SEPARATING_TIME) {
    await setLastLocationFetchTime(newLocationFetchTime); // Needs to be updated before performing a long task
    try { await sendTrip(); } catch (e) { console.log(`Network error : ${e}`); }
  } else {
    await setLastLocationFetchTime(newLocationFetchTime);
  }

  console.log(`New location received at : ${lastLocationFetchTime}`);

  // Iterate over every location received and choose the pertinent ones
  const trip: UserLocation[] = await getTrip();
  const { locations } = data as { locations: LocationObject[] };

  locations.forEach((l) => {
    trip.push({
      timestamp: l.timestamp,
      latitude: l.coords.latitude,
      longitude: l.coords.longitude,
      accuracy: l.coords.accuracy || undefined,
      speed: l.coords.speed || undefined,
      permissionLevel: locationPermissionLevel,
      isApple,
      isForeground: AppState.currentState === "active"
    });
  });

  await setTrip(trip);
});
