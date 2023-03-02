import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapLibreGL, { Logger } from "@maplibre/maplibre-react-native";
import { MapStyle } from "@/api/location";
import { AppText } from "@/components/base/AppText";
import { AppContext } from "@/components/ContextProvider";
import { LatLng, RallyingPoint } from "@/api";
import LocationPin from "@/assets/location_pin.svg";
import { AppColorPalettes } from "@/theme/colors";

MapLibreGL.setAccessToken(null);

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
  const { services } = useContext(AppContext);
  const [position, _] = useState<LatLng | undefined>(services.location.getLastKnownLocation());

  const [displayedRallyingPoints, setDisplayedRallyingPoints] = useState<RallyingPoint[]>([]);
  if (position) {
    const coordinatesA = [position.lng, position.lat];
    const onRegionChange = async c => {
      // const lowerLeft = c.properties.visibleBounds[1];
      // const upperRight = c.properties.visibleBounds[0];
      //const rallyingPoints = await services.rallyingPoint.view({ lat: lowerLeft[1], lng: lowerLeft[0] }, { lat: upperRight[1], lng: upperRight[0] });
      // TODO   console.log(c, c.properties.visibleBounds);
      // setDisplayedRallyingPoints(rallyingPoints);
    };

    return (
      <MapLibreGL.MapView onRegionDidChange={onRegionChange} style={styles.map} styleJSON={MapStyle} logoEnabled={false} attributionEnabled={false}>
        <MapLibreGL.Camera maxZoomLevel={15} minZoomLevel={5} zoomLevel={8} centerCoordinate={coordinatesA} />
        {displayedRallyingPoints.map(rp => (
          <MapLibreGL.MarkerView coordinate={[rp.location.lng, rp.location.lat]} id={rp.id!}>
            <LocationPin fill={AppColorPalettes.orange[700]} />
          </MapLibreGL.MarkerView>
        ))}
      </MapLibreGL.MapView>
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
