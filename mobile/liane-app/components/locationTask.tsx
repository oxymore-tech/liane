import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Text } from 'react-native';
import React, { useEffect, useState } from "react";
import { sendLocation } from './apiRequest';
import {storeLocation, getLocations, deleteLocations } from './locationStorage';
import { LocationObject } from 'expo-location';

const TASK_LOCATION = 'TASK_LOCATION';
/**
 * 
 * @param locations 
 * @param stored 
 */
function sendLocations(locations : LocationObject[], stored = false) {
  return locations.forEach(location => {
    sendLocation(location).then(result => {
      if(result == false && stored == false) {
        storeLocation(location);
      } else if(result == true && stored == true) {
        deleteLocations([location.timestamp.toString()]);
      }
    }).catch(e => {
      console.log('Erreur : ', e);
      if (stored == false) storeLocation(location);
    });
  });
}

/**
 * 
 */
export function initializeLocationTask() {
  TaskManager.defineTask(TASK_LOCATION, async function (result: any) {
    try {
      console.log('Nouvelle localisation : ', result);
      let locations : LocationObject[] = result.data.locations;
      if(locations.length > 0) {
        sendLocations(locations);
      }
      getLocations().then(locations => sendLocations(locations, true)).catch(e => console.log('Erreur : ', e));
      return;
    } catch (err) {
      console.log('Erreur : ', err);
      return;
    }
  });
}

export async function registerLocationTask() {
  try {
    await Location.startLocationUpdatesAsync(TASK_LOCATION, {
      // distanceInterval: 50,
      // timeInterval : 30000 
      pausesUpdatesAutomatically: true,
      activityType: Location.ActivityType.AutomotiveNavigation
    });
    console.log("Task registered")
  } catch (err) {
    console.log("Task Register failed:", err)
  }
}