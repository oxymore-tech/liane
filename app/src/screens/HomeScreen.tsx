import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { getLastKnownLocation } from "@/api/location";
import { AppText } from "@/components/base/AppText";

const mapStyle = JSON.stringify(require("../../map-style-osm.json"));

const HomeScreen = () => {

  MapboxGL.setWellKnownTileServer(MapboxGL.TileServers.MapLibre);
  MapboxGL.setAccessToken("pk.eyJ1IjoiY2xhdmUiLCJhIjoiY2xiZHZicW4xMDRqZDN4bXN6OWZ2eWhvYyJ9.TZi6_5LlNg15NsKUT6sV7A");

  const [location, setLocation] = useState(null);
  useEffect(() => {
    async function getLocation() {
      const loc = await getLastKnownLocation();
      setLocation(loc);
    }
    getLocation();
  }, []);

  if (location) {
    const coordinatesA = [location.lng, location.lat];
    const coordinatesB = [location.lng, location.lat - 0.25];

    return (
      <View style={styles.page}>
        <View style={styles.container}>

          <MapboxGL.MapView style={styles.map} styleJSON={mapStyle}>

            <MapboxGL.Camera
              maxZoomLevel={15}
              minZoomLevel={5}
              zoomLevel={8}
              centerCoordinate={coordinatesA}
            />

            <View>
              <MapboxGL.MarkerView
                id="A"
                coordinate={coordinatesA}
              >
                <View style={{ height: 10, width: 10, backgroundColor: "red" }} />
              </MapboxGL.MarkerView>
            </View>
            <View>
              <MapboxGL.MarkerView
                id="B"
                coordinate={coordinatesB}
              >
                <View style={{ height: 10, width: 10, backgroundColor: "red" }} />
              </MapboxGL.MarkerView>
            </View>

          </MapboxGL.MapView>
        </View>
      </View>
    );
  }
  // TODO else
  return (
    <View>
      <AppText>No map.</AppText>
    </View>
  );

};

export default HomeScreen;
const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  container: {
    height: "100%",
    width: "100%",
    marginBottom: 48,
    flex: 1
  },
  map: {
    flex: 1
  }
});