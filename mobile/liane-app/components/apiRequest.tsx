import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationObject } from 'expo-location';
import { getLocations, deleteLocations } from './locationStorage';

const endpoint = "https://liane.gjini.co/api";

/**
 * Send user position (location) to server
 * @param location : LocationObject
 * @result boolean : true is success else false
 */
export async  function sendLocation(location : LocationObject) {
    let token0 = await AsyncStorage.getItem("tokenJWT");
    let token = (token0 == null) ? "" : token0;
    let accur = location.coords.accuracy;
    let accurInteger = (accur == null) ? 0 : Number.parseInt(Math.round(accur).toString());
    console.log("token : ", token)
    fetch(endpoint + "/location", {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization' :  'Bearer' + token
        },
        body: JSON.stringify([{
            coords: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: accurInteger,
                speed: location.coords.speed
            },
            timestamp: location.timestamp
        }])
    })//.then((json0) => (json0 == null) ? "" : json0.text())
    .then((json) => {
      //console.log("JSON RECUP : ", json);
      return true;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
}

/**
 * Log-in a user 
 * @param phoneNumber phone number of the user
 * @param code code received by the user
 */
export async function userLogin(phoneNumber : string, code : string) {
    return fetch(endpoint + "/auth/login?number="+phoneNumber+"&code="+code, {
        method: 'POST',
        headers: {
/*            Accept: 'application/json',
            'Content-Type': 'application/json'  */
        }
    })
    .then(result => result.text())
    .then((token) => {
        console.log('TOKEN ? : ', JSON.stringify(token));
        AsyncStorage.setItem("tokenJWT", token);
        return true;
    })
    .catch((error) => {
      console.log("ERREUR dans userLogin");
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
      console.log("ERREUR dans userSensSms");
      console.error(error);
      return false;
    });
}