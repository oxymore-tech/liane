import React, { useContext, useState } from "react";
import { StyleSheet } from "react-native";
import MapLibreGL, { Logger, RegionPayload } from "@maplibre/maplibre-react-native";
import { MapStyle } from "@/api/location";
import { AppContext } from "@/components/ContextProvider";
import { LianeDisplay, LianeSegment } from "@/api";
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

  if (!position) {
    return <></>;
  }

  const center = [position.lng, position.lat];
  const onRegionChange = async (feature: GeoJSON.Feature<GeoJSON.Point, RegionPayload>) => {
    const { from, to } = bboxToLatLng(feature.properties.visibleBounds);
    if (feature.properties.zoomLevel < 9) {
      setLianeDisplay(undefined);
      return;
    }
    const r = await services.liane.display(from, to);
    setLianeDisplay(r);
  };

  // console.log(JSON.stringify(lianeDisplay));

  return (
    <MapLibreGL.MapView onRegionDidChange={onRegionChange} style={styles.map} styleJSON={MapStyle} logoEnabled={false} attributionEnabled={false}>
      <MapLibreGL.Camera maxZoomLevel={15} minZoomLevel={5} zoomLevel={10} centerCoordinate={center} />
      <LianeSegmentLayer lianeSegments={lianeDisplay?.segments ?? []} />
      {lianeDisplay?.points.map(p => (
        <MapLibreGL.MarkerView
          key={p.rallyingPoint.id!}
          id={p.rallyingPoint.id!}
          coordinate={toGeoJson(p.rallyingPoint.location)}
          title={p.rallyingPoint.label}>
          <LocationPin fill={p.lianes.length > 0 ? AppColorPalettes.orange[700] : AppColorPalettes.gray[500]} width={20} />
        </MapLibreGL.MarkerView>
      ))}
    </MapLibreGL.MapView>
  );
};

type LianeSegmentLayerProps = {
  lianeSegments: LianeSegment[];
};

const LianeSegmentLayer = ({ lianeSegments }: LianeSegmentLayerProps) => {
  const shape: GeoJSON.MultiLineString = {
    type: "MultiLineString",
    coordinates: lianeSegments.filter(s => s.coordinates.length > 1).map(s => s.coordinates)
  };

  return (
    <MapLibreGL.ShapeSource id="segments" shape={shape}>
      <MapLibreGL.LineLayer id="segmentLayer" style={{ lineColor: AppColorPalettes.orange[500], lineWidth: 3 }} />
    </MapLibreGL.ShapeSource>
  );
};

export default AppMapView;
const styles = StyleSheet.create({
  map: {
    flex: 1
  }
});
