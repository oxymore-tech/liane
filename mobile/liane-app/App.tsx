import React, { useState, useEffect} from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as BackgroundFetch from "expo-background-fetch"
import * as TaskManager from "expo-task-manager"

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    // Error occurred - check `error.message` for more details.
    return;
  }
  if (data) {
    console.log('LOCATION : ', data);
    const { locations } = data;
    // do something with the locations captured in the background
  }
});

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  
  /*
  (async () => {
    try {
      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 5, // seconds,
      })
      console.log("Task registered")
    } catch (err) {
      console.log("Task Register failed:", err)
    }
  })();
  */

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestPermissionsAsync();
      if (status === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          distanceInterval : 1,
          timeInterval : 10
        });
      }
    })();
  }, []);

  let text = 'Waiting..';
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.container}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
