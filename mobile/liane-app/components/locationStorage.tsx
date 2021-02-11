import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationObject } from 'expo-location';

/**
 * Store a location on the mobile phone using AsyncStorage.
 * Format of the data  : key => timestamp | value => locationObject 
 * @param location : location to store
 */
export async function storeLocation(location : LocationObject) {
    try {
        const jsonValue = JSON.stringify(location);
        await AsyncStorage.setItem(location.timestamp.toString(), jsonValue);
    } catch (e) {
        console.log()
    }
}

/**
 * Get a list of locations stored on AsyncStorage
 * Format of the data : [LocationObject1,LocationObject2,...,LocationObjectN]
 * @param keys : keys to get associated LocationObjects list
 * @return Promise<LocationObject[]>
 */
export async function getLocations(keys = []) : Promise<LocationObject[]> {
        let lkeys : string[] = [];
        let locations : LocationObject[] = [];
        try {
            lkeys = keys.length != 0 ? keys : await AsyncStorage.getAllKeys();
            const jsonLocationObjects = await AsyncStorage.multiGet(lkeys);
            jsonLocationObjects.forEach(locationObject => {
                let location = locationObject[1] != null ? JSON.parse(locationObject[1]) : null;
                locations.push(location);
            }); 
            return locations;
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
export async function deleteLocations(keys : string[]) {
    try {
        await AsyncStorage.multiRemove(keys);
      } catch(e) {
        console.log('Erreur en supprimant des clées  :', e);
    }
}