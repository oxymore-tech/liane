import { LocationObject } from 'expo-location';
import { getLocations, deleteLocations } from './locationStorage';

const endpoint = "https://liane.gjini.co/api/location";

/**
 * Send user position (location) to server
 * @param location : LocationObject
 * @result boolean : true is success else false
 */
export function sendLocation(location : LocationObject) {
    return fetch(endpoint + "/api", {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            coords: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                speed: location.coords.speed
            },
            timestamp: location.timestamp
        })
    }).then((response) => response.json())
    .then((json) => {
      return json.result == true;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
}