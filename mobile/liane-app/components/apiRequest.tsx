import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationObject } from 'expo-location';
import { getLocations, deleteLocations } from './locationStorage';

const endpoint = "https://liane.gjini.co/api";

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


/* ===== Auth system ========= *

1) Utilisateur demande SMS (entre son numéro de tel)
2) Utilisateur reçois son SMS
3) Utilisateur envoi son code (et son numéro) et reçois token JWT
4) L'app stocke le token
5) Toutes les requetes contiennent en header le token
*/

/**
 * Log-in a user 
 * @param phoneNumber phone number of the user
 * @param code code received by the user
 */
export function userLogin(phoneNumber : string, code : string) {
    return fetch(endpoint + "/auth/login?number="+phoneNumber+"&code="+code, {
        method: 'POST',
        headers: {
/*            Accept: 'application/json',
            'Content-Type': 'application/json'  */
        }
    })
    .then((data) => {
        console.log('TOKEN : ', data);
        AsyncStorage.setItem("tokenJWT", 'TOKEN_TO_SAVE');
        return true;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
}

/**
 * Ask for an SMS code to the backend
 * @param phoneNumber phone number of the user
 */
export function userSendSms(phoneNumber : string) {
    return fetch(endpoint + "/auth/sms?number="+phoneNumber, {
        method: 'POST',
        headers: {
   /*         Accept: 'application/json',
            'Content-Type': 'application/json' */
        }
    })
    // .then((response) => response.json())
    .then(() => {
      return true;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
}