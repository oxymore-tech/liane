import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { registerLocationTask, initializeLocationTask } from './components/locationTask';


initializeLocationTask();

export default function App() {
  useEffect(() => {
    registerLocationTask().then(() => console.log("Task registred !"))
      .catch(err => console.error(err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.container}>Bonjourno !</Text>
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
