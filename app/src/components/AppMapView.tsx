import React, { useContext, useState } from "react";
import { StyleSheet } from "react-native";
import MapLibreGL, { Logger, RegionPayload } from "@maplibre/maplibre-react-native";
import { MapStyle } from "@/api/location";
import { AppContext } from "@/components/ContextProvider";
import { LianeDisplay } from "@/api";
import LocationPin from "@/assets/location_pin.svg";
import { AppColorPalettes } from "@/theme/colors";
import { GeoJSON } from "geojson";
import { bboxToLatLng, toGeoJson } from "@/api/geo";

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
  const [lianeDisplay, setLianeDisplay] = useState<LianeDisplay>();

  const position = services.location.getLastKnownLocation();
  const center = [position.lng, position.lat];
  const onRegionChange = async (feature: GeoJSON.Feature<GeoJSON.Point, RegionPayload>) => {
    const { from, to } = bboxToLatLng(feature.properties.visibleBounds);
    const r = await services.liane.display(from, to);
    setLianeDisplay(r);
  };

  return (
    <MapLibreGL.MapView onRegionDidChange={onRegionChange} style={styles.map} styleJSON={MapStyle} logoEnabled={false} attributionEnabled={false}>
      <MapLibreGL.Camera maxZoomLevel={15} minZoomLevel={5} zoomLevel={8} centerCoordinate={center} />
      {lianeDisplay?.points.map(p => (
        <MapLibreGL.MarkerView
          coordinate={toGeoJson(p.rallyingPoint.location)}
          id={p.rallyingPoint.id!}
          title={p.rallyingPoint.label}
          key={p.rallyingPoint.id!}>
          <LocationPin fill={AppColorPalettes.orange[700]} />
        </MapLibreGL.MarkerView>
      ))}
    </MapLibreGL.MapView>
  );
};

export default AppMapView;
const styles = StyleSheet.create({
  map: {
    flex: 1
  }
});
