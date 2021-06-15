import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocationObject } from "expo-location";

/**
 * Store new locations on the mobile phone using AsyncStorage.
 */
export async function storeLocation(newLocations: LocationObject[]) {
  const previousLocations = await getStoredLocations();
  const locations = [...previousLocations, ...newLocations];
  await AsyncStorage.setItem("Location", JSON.stringify(locations));
  return locations;
}

/**
 * Get previously stored locations.
 */
async function getStoredLocations(): Promise<LocationObject[]> {
  const locations = await AsyncStorage.getItem("Location");
  if (locations) {
    return JSON.parse(locations);
  }
  return [];
}

/**
 * Remove a list of items stored on AsyncStorage
 */
export async function deleteLocations(timeStamps: string[]) {
  const locationsList = await getStoredLocations();
  await AsyncStorage.setItem("Location", JSON.stringify(locationsList.filter(((element: LocationObject) => !(element.timestamp in timeStamps)))));
}
