import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import * as BackgroundFetch from "expo-background-fetch"
import * as TaskManager from "expo-task-manager"

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
      .catch(err => console.error(err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.container}>Bonjour !</Text>
    </View>
  );
}

async function registerTask() {
  // let { status } = await Permissions.askAsync(Permissions.LOCATION);
  try {
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      distanceInterval: 0,
      foregroundService: {
        notificationTitle: "LianeApp",
        notificationBody: "Service actif"
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
