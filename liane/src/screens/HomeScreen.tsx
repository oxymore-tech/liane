import { View, StyleSheet } from "react-native";
import React from "react";
import AppMapView from "@/components/AppMapView";

const HomeScreen = () => (
  <View style={styles.page}>
    <View style={styles.container}>
      <AppMapView />
    </View>
  </View>
);

export default HomeScreen;
const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  container: {
    height: "100%",
    width: "100%",
    flex: 1
  }
});
