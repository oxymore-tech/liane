import React, { useContext, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import MapLibreGL, { Logger, RegionPayload } from "@maplibre/maplibre-react-native";
import { AppContext } from "@/components/ContextProvider";
import { Liane, LianeDisplay, LianeSegment } from "@/api";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { GeoJSON } from "geojson";
import { bboxToLatLng } from "@/api/geo";
import { TripSegmentView } from "@/components/trip/TripSegmentView";
import { getTotalDuration } from "@/components/trip/trip";
import { AppPressable } from "@/components/base/AppPressable";
import { NavigationContainerRefWithCurrent, NavigationProp } from "@react-navigation/native";
import { useAppNavigation } from "@/api/navigation";
import { AppText } from "@/components/base/AppText";
import { Column, Row } from "@/components/base/AppLayout";
import { MapStyleProps } from "@/api/location";

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

  const { navigation } = useAppNavigation();

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
        setLoadingDisplay(false);
        return;
      }
      try {
        const r = await services.liane.display(from, to);
        if (regionCallbackRef.current === initialRef) {
          // If current timeout is still active, show display
          setLoadingDisplay(false);
          setLianeDisplay(r);
        }
      } catch (e) {
        console.warn(e);
        // TODO show error
        setLoadingDisplay(false);
      }
    }, 150);
  };

  const displayedSegments = lianeDisplay?.segments ?? [];
  const displayedLianes = lianeDisplay?.lianes ?? [];
  return (
    <View style={styles.map}>
      <MapLibreGL.MapView onRegionDidChange={onRegionChange} style={styles.map} {...MapStyleProps} logoEnabled={false} attributionEnabled={false}>
        <MapLibreGL.Camera maxZoomLevel={15} minZoomLevel={5} zoomLevel={10} centerCoordinate={center} />
        <LianeSegmentLayer lianeSegments={displayedSegments} />
      </MapLibreGL.MapView>
      {!loadingDisplay && lianeDisplay && (
        <Column style={[styles.lianeListContainer, styles.shadow, { maxHeight: 150 }]} spacing={8}>
          {displayedLianes.length > 0 && (
            <AppText style={[styles.bold, { paddingHorizontal: 24 }]}>
              {displayedLianes.length} résultat{displayedLianes.length > 1 ? "s" : ""}
            </AppText>
          )}
          {displayedLianes.length === 0 && <AppText style={[{ paddingHorizontal: 24, alignSelf: "center" }]}>Aucune liane dans cette zone.</AppText>}
          <FlatList data={displayedLianes} renderItem={({ item }) => renderLianeOverview(item, navigation)} />
        </Column>
      )}
      {loadingDisplay && (
        <Row style={[styles.loaderContainer, styles.shadow]} spacing={8}>
          <ActivityIndicator color={AppColors.darkBlue} />
          <AppText>Chargement...</AppText>
        </Row>
      )}
    </View>
  );
};

type LianeSegmentLayerProps = {
  lianeSegments: LianeSegment[];
};
const renderLianeOverview = (liane: Liane, navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) => {
  return (
    <AppPressable
      foregroundColor={WithAlpha(AppColors.black, 0.1)}
      style={{ paddingHorizontal: 24, paddingVertical: 8 }}
      onPress={() => {
        navigation.navigate("LianeDetail", { liane });
      }}>
      <TripSegmentView
        departureTime={liane.departureTime}
        duration={getTotalDuration(liane.wayPoints)}
        from={liane.wayPoints[0].rallyingPoint}
        to={liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint}
      />
    </AppPressable>
  );
};

const LianeSegmentLayer = ({ lianeSegments }: LianeSegmentLayerProps) => {
  const features: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: lianeSegments.map(s => {
      console.log(s.lianes.length);
      return {
        type: "Feature",
        properties: {
          width: Math.min(5, s.lianes.length) // TODO categorize
        },
        geometry: {
          type: "LineString",
          coordinates: s.coordinates.length > 1 ? s.coordinates : [s.coordinates[0], s.coordinates[0]]
        }
      };
    })
  };
  /*const shape: GeoJSON.MultiLineString = {
    type: "MultiLineString",
    coordinates: lianeSegments.filter(s => s.coordinates.length > 1).map(s => s.coordinates)
  };*/

  return (
    <MapLibreGL.ShapeSource id="segments" shape={features}>
      <MapLibreGL.LineLayer belowLayerID="place" id="segmentLayer" style={{ lineColor: AppColorPalettes.orange[500], lineWidth: ["get", "width"] }} />
    </MapLibreGL.ShapeSource>
  );
};

export default AppMapView;
const styles = StyleSheet.create({
  map: {
    flex: 1
  },
  bold: {
    fontWeight: "bold"
  },
  loaderContainer: {
    position: "absolute",
    bottom: 96,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: AppColorPalettes.blue[100],
    alignSelf: "center",
    borderRadius: 24
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,

    elevation: 4
  },
  lianeListContainer: {
    position: "absolute",
    bottom: 80 - 26,
    left: 24,
    right: 24,
    paddingVertical: 16,
    backgroundColor: AppColorPalettes.gray[100],
    alignSelf: "center",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 32
  }
});
