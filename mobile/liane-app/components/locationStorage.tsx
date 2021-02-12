import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationObject } from 'expo-location';

/**
 * Store a location on the mobile phone using AsyncStorage.
 * Format of the data  : key => timestamp | value => locationObject 
 * @param location : location to store
 */
export async function storeLocation(location : LocationObject) {
    try {
        //const jsonValue = JSON.stringify(location);
        let previousLocs = await AsyncStorage.getItem("Location");
        let previousLocsList : LocationObject[] = (previousLocs == null) ? [] : JSON.parse(previousLocs);
        previousLocsList.push(location);
        await AsyncStorage.setItem("Location", JSON.stringify(previousLocsList));
    } catch (e) {
        console.log();
    }
}

/**
 * Get a list of locations stored on AsyncStorage
 * Format of the data : [LocationObject1,LocationObject2,...,LocationObjectN]
 * @param keys : keys to get associated LocationObjects list
 * @return Promise<LocationObject[]>
 */
export async function getLocations() : Promise<LocationObject[]> {
    let locations =  await AsyncStorage.getItem("Location")
        try {
            return ((locations == null) ? [] : JSON.parse(locations));
        } catch(e) {
            // read key error
            console.log('Impossible de récupérer les localisations : ', e);
            return [];
        }
}

/**
 * Remove a list of items stored on AsyncStorage
 * @param keys : keys of items to remove
 * @return void
 */
export async function deleteLocations(timeStamps : string[]) {
    try {
        const locationsList = await getLocations();
        await AsyncStorage.setItem("Location", JSON.stringify(locationsList.filter(((element : LocationObject) => !(element.timestamp in timeStamps)))));
      } catch(e) {
        console.log('Erreur en supprimant des clées  :', e);
    }
}