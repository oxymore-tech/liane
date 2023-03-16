import React, { useContext, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import MapLibreGL, { Logger, RegionPayload } from "@maplibre/maplibre-react-native";
import { MapStyle } from "@/api/location";
import { AppContext } from "@/components/ContextProvider";
import { LianeDisplay, LianeSegment } from "@/api";
import LocationPin from "@/assets/location_pin.svg";
import { AppColorPalettes, AppColors } from "@/theme/colors";
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
  const [loadingDisplay, setLoadingDisplay] = useState<boolean>(false);

  const position = services.location.getLastKnownLocation();
  const regionCallbackRef = useRef<number | undefined>();

  if (!position) {
    return <></>;
  }

  const center = [position.lng, position.lat];
  const onRegionChange = async (feature: GeoJSON.Feature<GeoJSON.Point, RegionPayload>) => {
    if (regionCallbackRef.current) {
      clearTimeout(regionCallbackRef.current);
    }
    setLoadingDisplay(true);
    regionCallbackRef.current = setTimeout(async () => {
      const initialRef = regionCallbackRef.current;
      const { from, to } = bboxToLatLng(feature.properties.visibleBounds);
      if (feature.properties.zoomLevel < 9) {
        setLianeDisplay(undefined);
        return;
      }
      const r = await services.liane.display(from, to);
      if (regionCallbackRef.current === initialRef) {
        // If current timeout is still active, show display
        setLoadingDisplay(false);
        setLianeDisplay(r);
      }
    }, 150);
  };

  // console.log(JSON.stringify(lianeDisplay));

  return (
    <View style={styles.map}>
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
      {loadingDisplay && (
        <View
          style={{
            position: "absolute",
            bottom: 96,
            paddingVertical: 8,
            paddingHorizontal: 24,
            backgroundColor: AppColorPalettes.gray[100],
            alignSelf: "center",
            borderRadius: 24
          }}>
          <ActivityIndicator color={AppColors.darkBlue} />
        </View>
      )}
    </View>
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
