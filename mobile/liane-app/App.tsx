<<<<<<< HEAD
import React, { useState, useEffect} from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as BackgroundFetch from "expo-background-fetch"
import * as TaskManager from "expo-task-manager"
import { LocationObject } from 'expo-location';
import * as Permissions from 'expo-permissions';
=======
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import * as BackgroundFetch from "expo-background-fetch"
import * as TaskManager from "expo-task-manager"
>>>>>>> 3568add24342f2e76090cd7ea3ccde0c0fb0a50f

const TASK_NAME = 'test';


TaskManager.defineTask(TASK_NAME, async (location) => {
  try {
    // fetch data here...
    console.log('On traite la tache', location);
    // let location = await Location.getCurrentPositionAsync({});
    console.log("Tache traitée : ");
    return;
  } catch (err) {
    return BackgroundFetch.Result.Failed
  }
})

export default function App() {
  const [location, setLocation] = useState<LocationObject>();
  const [errorMsg, setErrorMsg] = useState<String>();

  useEffect(() => {
    registerTask().then(() => console.log("OK !"))
<<<<<<< HEAD
    .catch(err => console.error(err));
=======
      .catch(err => console.error(err));
>>>>>>> 3568add24342f2e76090cd7ea3ccde0c0fb0a50f
  }, []);

  return (
    <View style={styles.container}>
<<<<<<< HEAD
      <Text style={styles.container}>Hello</Text>
=======
      <Text style={styles.container}>Bonjour !</Text>
>>>>>>> 3568add24342f2e76090cd7ea3ccde0c0fb0a50f
    </View>
  );
}

async function registerTask() {
  // let { status } = await Permissions.askAsync(Permissions.LOCATION);
  try {
    await Location.startLocationUpdatesAsync(TASK_NAME, {
<<<<<<< HEAD
      distanceInterval : 0,
      foregroundService : {
        notificationTitle : "LianeApp",
        notificationBody : "Service actif"
=======
      distanceInterval: 0,
      foregroundService: {
        notificationTitle: "LianeApp",
        notificationBody: "Service actif"
>>>>>>> 3568add24342f2e76090cd7ea3ccde0c0fb0a50f
      }
    });
    /*
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 5, // milliseconds,
    })
    */
    console.log("Task registered")
  } catch (err) {
    console.log("Task Register failed:", err)
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
