import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import MapboxGL, { Logger } from "@rnmapbox/maps";
import { MAPBOX_TOKEN } from "@env";
import { getLastKnownLocation } from "@/api/location";
import { AppText } from "@/components/base/AppText";

const mapStyle = JSON.stringify(require("../../map-style-osm.json"));

MapboxGL.setWellKnownTileServer(MapboxGL.TileServers.MapLibre!);
MapboxGL.setAccessToken(MAPBOX_TOKEN)
  .then();

Logger.setLogCallback((log) => {
  const { message } = log;
  // expected warnings - see https://github.com/mapbox/mapbox-gl-native/issues/15341#issuecomment-522889062
  return !!(message.match("Request failed due to a permanent error: Canceled")
        || message.match("Request failed due to a permanent error: Socket Closed"));

});

const AppMapView = () => {

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

    return (

      <MapboxGL.MapView style={styles.map} styleJSON={mapStyle}>

        <MapboxGL.Camera
          maxZoomLevel={15}
          minZoomLevel={5}
          zoomLevel={8}
          centerCoordinate={coordinatesA}
        />

      </MapboxGL.MapView>

    );
  }
  // TODO else
  return (
    <View>
      <AppText>No map.</AppText>
    </View>
  );

};

export default AppMapView;
const styles = StyleSheet.create({

  map: {
    flex: 1
  }
});