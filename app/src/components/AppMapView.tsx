import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapboxGL, { Logger } from "@rnmapbox/maps";
import { getLastKnownLocation, MapStyle } from "@/api/location";
import { AppText } from "@/components/base/AppText";
import { LatLng } from "@/api";

MapboxGL.setWellKnownTileServer(MapboxGL.TileServers.MapLibre!);
MapboxGL.setAccessToken(null).then();

Logger.setLogCallback(log => {
  const { message } = log;
  // expected warnings - see https://github.com/mapbox/mapbox-gl-native/issues/15341#issuecomment-522889062
  return !!(
    message.match("Request failed due to a permanent error: Canceled") ||
    message.match("Request failed due to a permanent error: Socket Closed") ||
    message.match("Request failed due to a permanent error: stream was reset: CANCEL")
  );
});

const AppMapView = () => {
  const [location, setLocation] = useState<LatLng>();
  useEffect(() => {
    getLastKnownLocation().then(setLocation);
  }, []);

  if (location) {
    const coordinatesA = [location.lng, location.lat];

    return (
      <MapboxGL.MapView style={styles.map} styleJSON={MapStyle} logoEnabled={false} attributionEnabled={false}>
        <MapboxGL.Camera maxZoomLevel={15} minZoomLevel={5} zoomLevel={8} centerCoordinate={coordinatesA} />
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
