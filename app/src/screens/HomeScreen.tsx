import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import MapboxGL, { Logger } from "@rnmapbox/maps";
import { getLastKnownLocation } from "@/api/location";
import { AppText } from "@/components/base/AppText";
import { LatLng } from "@/api";

const mapStyle = JSON.stringify(require("../../map-style-osm.json"));

MapboxGL.setWellKnownTileServer(MapboxGL.TileServers.MapLibre!);
MapboxGL.setAccessToken("pk.eyJ1IjoiY2xhdmUiLCJhIjoiY2xiZHZicW4xMDRqZDN4bXN6OWZ2eWhvYyJ9.TZi6_5LlNg15NsKUT6sV7A")
  .then();

Logger.setLogCallback((log) => {
  const { message } = log;
  // expected warnings - see https://github.com/mapbox/mapbox-gl-native/issues/15341#issuecomment-522889062
  return !!(message.match("Request failed due to a permanent error: Canceled")
      || message.match("Request failed due to a permanent error: Socket Closed"));

});

const HomeScreen = () => {
  const [location, setLocation] = useState<LatLng>();
  useEffect(() => {
    getLastKnownLocation()
      .then(setLocation);
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