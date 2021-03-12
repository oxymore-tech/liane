import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationObject } from 'expo-location';

const endpoint = "https://liane.gjini.co/api"; // http://192.168.1.66:8081/api

/**
 * Send user position (location) to server
 * @param location : LocationObject
 * @result boolean : true is success else false
 */
export async function sendLocation(location: LocationObject) {
  let token0 = await AsyncStorage.getItem("tokenJWT");
  let token = (token0 == null) ? "" : token0;
  let accur = location.coords.accuracy;
  let accurInteger = (accur == null) ? 0 : Number.parseInt(Math.round(accur).toString());
  console.log("token : ", token)
  return fetch(endpoint + "/location", {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer' + token
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
  }).then(() => {
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
 * @param pushToken
 */
export async function userLogin(phoneNumber: string, code: string, pushToken: string) {
  console.log('LE TOKEN KON ENVOI : ', pushToken);
  const url = new URL("/auth/login", endpoint);
  url.searchParams.append("number", phoneNumber);
  url.searchParams.append("code", code);
  url.searchParams.append("token", pushToken);
  return fetch(url.toString(), {
    method: 'POST'
  })
    .then(async (result) => {
      if (result.status != 200) {
        return false;
      }
      const token = await result.text();
      console.log('TOKEN ? : ', JSON.stringify(token));
      await AsyncStorage.setItem("tokenJWT", token);
      return token;
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
export async function userSendSms(phoneNumber: string) {
  return fetch(endpoint + "/auth/sms?number=" + phoneNumber, {
    method: 'POST'
  })
    .then(() => {
      return true;
    })
    .catch((error) => {
      console.log("ERREUR dans userSensSms");
      console.error(error);
      return false;
    });
}

/**
 * Get user notifications
 */
export async function getNotifications() {
  const token0 = await AsyncStorage.getItem("tokenJWT");
  const token = (token0 == null) ? "" : token0;
  return fetch(`${endpoint}/notification`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer' + token
    }
  })
    .then((response) => response.json())
    .catch((error) => {
      console.log("ERREUR en récupérant les notifications");
      console.error(error);
      return false;
    });
}

/**
 * Delete a notification from the user
 */
export async function deleteNotification(notificationTimestamp: number) {
  console.log('NOTIF TIMESTAMP : ', notificationTimestamp);
  const token0 = await AsyncStorage.getItem("tokenJWT");
  const token = (token0 == null) ? "" : token0;
  return fetch(endpoint + "/notification/delete?date=" + notificationTimestamp, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer' + token
    }
  })
    .then(() => {
      return true;
    })
    .catch((error) => {
      console.error(error);
      return false;
    });
}