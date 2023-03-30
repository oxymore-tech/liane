import React, { useContext, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import MapLibreGL, { Logger, RegionPayload } from "@maplibre/maplibre-react-native";
import { AppContext } from "@/components/ContextProvider";
import { LatLng, Liane, LianeDisplay, LianeMatch, LianeSegment } from "@/api";
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
import { InternalLianeSearchFilter } from "@/util/ref";

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

const AppMapView = ({ position }: { position: LatLng }) => {
  const { services } = useContext(AppContext);
  const [lianeDisplay, setLianeDisplay] = useState<LianeDisplay>();
  const [loadingDisplay, setLoadingDisplay] = useState<boolean>(false);

  const regionCallbackRef = useRef<number | undefined>();

  const { navigation } = useAppNavigation<"LianeMatchDetail">();

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
  const features = useMemo(() => toFeatureCollection(displayedSegments), [lianeDisplay]);
  const displayedLianes = lianeDisplay?.lianes ?? [];
  return (
    <View style={styles.map}>
      <MapLibreGL.MapView
        onRegionDidChange={onRegionChange}
        rotateEnabled={false}
        style={styles.map}
        {...MapStyleProps}
        logoEnabled={false}
        attributionEnabled={false}>
        <MapLibreGL.Camera maxZoomLevel={15} minZoomLevel={5} zoomLevel={10} centerCoordinate={center} />
        <MapLibreGL.ShapeSource id="segments" shape={features}>
          <MapLibreGL.LineLayer
            belowLayerID="place"
            id="segmentLayer"
            style={{ lineColor: AppColorPalettes.orange[500], lineWidth: ["get", "width"] }}
          />
        </MapLibreGL.ShapeSource>
      </MapLibreGL.MapView>
      {!loadingDisplay && lianeDisplay && (
        <Column style={[styles.lianeListContainer, styles.shadow]} spacing={8}>
          {displayedLianes.length > 0 && (
            <AppText style={[styles.bold, { paddingHorizontal: 24 }]}>
              {displayedLianes.length} résultat{displayedLianes.length > 1 ? "s" : ""}
            </AppText>
          )}
          {displayedLianes.length === 0 && <AppText style={[{ paddingHorizontal: 24, alignSelf: "center" }]}>Aucune liane dans cette zone.</AppText>}
          <FlatList
            style={{
              maxHeight: 56 * 2
            }}
            data={displayedLianes}
            keyExtractor={i => i.id!}
            renderItem={({ item }) => renderLianeOverview(item, navigation)}
          />
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

const renderLianeOverview = (liane: Liane, navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) => {
  const freeSeatsCount = liane.members.map(l => l.seatCount).reduce((acc, c) => acc + c, 0);
  return (
    <AppPressable
      foregroundColor={WithAlpha(AppColors.black, 0.1)}
      style={{ paddingHorizontal: 24, paddingVertical: 8 }}
      onPress={() => {
        let y: { lianeMatch: LianeMatch; filter: InternalLianeSearchFilter } = {
          lianeMatch: { liane, wayPoints: liane.wayPoints, match: { type: "Exact" }, freeSeatsCount },
          filter: {
            from: liane.wayPoints[0].rallyingPoint,
            to: liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint,
            targetTime: { dateTime: liane.departureTime, direction: "Departure" },
            availableSeats: freeSeatsCount
          }
        };
        navigation.navigate("LianeMatchDetail", y);
      }}>
      <TripSegmentView
        departureTime={liane.departureTime}
        duration={getTotalDuration(liane.wayPoints)}
        from={liane.wayPoints[0].rallyingPoint}
        to={liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint}
        freeSeatsCount={freeSeatsCount}
      />
    </AppPressable>
  );
};

const toFeatureCollection = (lianeSegments: LianeSegment[]): GeoJSON.FeatureCollection => {
  return {
    type: "FeatureCollection",
    features: lianeSegments.map(s => {
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
    flexShrink: 1,
    paddingVertical: 16,
    backgroundColor: AppColorPalettes.gray[100],
    alignSelf: "center",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 32
  }
});
