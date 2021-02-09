import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Text } from 'react-native';
import React, { useEffect, useState } from "react";

const Main = () => {
  const [gpsLatitude, setgpsLatitude] = useState(null);
  const [gpsLongitude, setgpsLongitude] = useState(null);

  useEffect(() => {
    (async () => await _askForLocationPermission())();

    const interval = setInterval(() => {
      uploadDataAtInterval();
    }, 10000);
    return () => clearInterval(interval);
  });

  const backgroundLocationFetch = async () => {
    const { status } = await Location.requestPermissionsAsync();
    if (status === 'granted') {
      await Location.startLocationUpdatesAsync('FetchLocationInBackground', {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 1,
        foregroundService: {
          notificationTitle: 'Live Tracker',
          notificationBody: 'Live Tracker is on.'
        }
      });
    }
  }


  const _askForLocationPermission = async () => {
    (async () => {
      let { status } = await Location.requestPermissionsAsync();
      if (status !== 'granted') {
        setgpsErrorMsg('Permission to access location was denied');
      }
    })();
  };

  const uploadDataAtInterval = async () => {
      console.log('Coords : ');
      
  }

  const getGPSPosition = async () => {
    let location = await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
    setgpsLatitude(location.coords.latitude);
    setgpsLongitude(location.coords.longitude);
  }


  backgroundLocationFetch();

  return(<Text>Meeec</Text>);
};

TaskManager.defineTask('FetchLocationInBackground', ({ data, error }) => {
  if (error) {
    console.log("Error bg", error)
    return;
  }
  if (data) {
    const { locations } = data;
    console.log("BGGGG->", locations[0].coords.latitude, locations[0].coords.longitude);
  }
});

export default Main;