import React, { ComponentType, ForwardedRef, forwardRef, PropsWithChildren, useContext, useImperativeHandle, useRef, useState } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import MapLibreGL, { Expression, Logger, MarkerViewProps, RegionPayload } from "@maplibre/maplibre-react-native";
import { LatLng } from "@/api";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { FeatureCollection, Position } from "geojson";
import { DEFAULT_TLS, FR_BBOX, MapStyleProps } from "@/api/location";
import { PositionButton } from "@/components/map/PositionButton";
import { AppContext } from "@/components/context/ContextProvider";
import { DisplayBoundingBox, fromBoundingBox } from "@/util/geometry";
import { contains } from "@/api/geo";
import distance from "@turf/distance";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import MapTilerLogo from "@/assets/images/maptiler-logo.svg";
import Images = MapLibreGL.Images;
import UserLocation = MapLibreGL.UserLocation;
import { useSubject } from "@/util/hooks/subscription";
import { SubscriptionLike } from "rxjs";
import { displayInfo } from "@/components/base/InfoDisplayer";
import { AppPressableOverlay } from "../base/AppPressable";
import { AppIcon } from "../base/AppIcon";
import { AppStyles } from "@/theme/styles";
import { AppLogger } from "@/api/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";

//const rp_pickup_icon = require("../../../assets/icons/rp_orange.png");
const rp_icon = require("../../../assets/icons/rp_gray.png");
const rp_deposit_icon = require("../../../assets/icons/rp_pink.png");
const rp_deposit_cluster_icon = require("../../../assets/icons/rp_pink_blank.png");

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

export interface AppMapViewController {
  setCenter: (position: LatLng, zoom?: number, duration?: number) => Promise<void> | undefined;
  getVisibleBounds: () => Promise<GeoJSON.Position[]> | undefined;
  fitBounds: (bbox: DisplayBoundingBox, duration?: number) => void;
  getZoom: () => Promise<number> | undefined;
  getCenter: () => Promise<Position> | undefined;
  queryFeatures: (coordinate?: Position, filter?: Expression, layersId?: string[]) => Promise<FeatureCollection | undefined> | undefined;
  subscribeToRegionChanges: (callback: (payload: RegionPayload) => void) => SubscriptionLike;
}
// @ts-ignore
const MapControllerContext = React.createContext<AppMapViewController>();

export const useAppMapViewController = () => useContext<AppMapViewController>(MapControllerContext);

export type MapMovedCallback = (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: GeoJSON.Position[] }) => void;
export interface AppMapViewProps extends PropsWithChildren {
  // position: LatLng;
  onRegionChanged?: MapMovedCallback;
  onStartMovingRegion?: () => void;
  onStopMovingRegion?: () => void;
  showGeolocation?: boolean;
  bounds?: DisplayBoundingBox | undefined;
  onMapLoaded?: () => void;
}

const AppMapView = forwardRef(
  (
    { onRegionChanged, onStartMovingRegion, children, showGeolocation = false, bounds, onMapLoaded, onStopMovingRegion }: AppMapViewProps,
    ref: ForwardedRef<AppMapViewController>
  ) => {
    const { services } = useContext(AppContext);
    const mapRef = useRef<MapLibreGL.MapView>();
    const cameraRef = useRef<MapLibreGL.Camera>();
    const [animated, setAnimated] = useState(false);
    //const [showActions, setShowActions] = useState(showGeolocation);

    const wd = useWindowDimensions();
    const scale = Platform.OS === "android" ? wd.scale : 1;
    const regionSubject = useSubject<RegionPayload>();

    const controller: AppMapViewController = {
      getCenter: () => mapRef.current?.getCenter(),
      setCenter: (p: LatLng, zoom?: number, duration = 350) => {
        cameraRef.current?.setCamera({
          centerCoordinate: [p.lng, p.lat],
          zoomLevel: zoom,
          animationMode: "easeTo",
          animationDuration: duration
        });
        if (cameraRef.current) {
          return new Promise<void>(resolve => setTimeout(resolve, duration));
        }
      },
      queryFeatures: async (coordinates?: Position, filter?: Expression, layersId?: string[]) => {
        if (coordinates) {
          // query at point
          const pointInView = await mapRef.current?.getPointInView(coordinates)!;
          return mapRef.current?.queryRenderedFeaturesAtPoint(
            pointInView, //[(pointInView[1] + 16) * scale, (pointInView[0] + 16) * scale, (pointInView[1] - 16) * scale, (pointInView[0] - 16) * scale],
            filter,
            layersId
          );
        } else {
          // query visible viewport
          const b = await mapRef.current?.getVisibleBounds()!;
          const ne = await mapRef.current?.getPointInView(b[0])!;
          const sw = await mapRef.current?.getPointInView(b[1])!;
          //console.log(ne, sw);
          return mapRef.current?.queryRenderedFeaturesInRect([sw[1] * scale, ne[0] * scale, 0, 0], filter, layersId);
        }
      },
      getVisibleBounds: () => mapRef.current?.getVisibleBounds(),
      getZoom: () => mapRef.current?.getZoom(),
      fitBounds: (bbox: DisplayBoundingBox, duration?: number) =>
        cameraRef.current?.fitBounds(bbox.ne, bbox.sw, [bbox.paddingTop, bbox.paddingRight, bbox.paddingBottom, bbox.paddingLeft], duration),
      subscribeToRegionChanges: callback => regionSubject.subscribe(callback)
    };

    useImperativeHandle(ref, () => controller);
    const regionMoveCallbackRef = useRef<number | undefined>();
    const moving = useRef<boolean>(false);

    const [showUserLocation, setShowUserLocation] = useState(false);
    //const [flyingToLocation, setFlyingToLocation] = useState(false);

    return (
      <View style={styles.map}>
        <MapLibreGL.MapView
          // @ts-ignore
          ref={mapRef}
          onTouchMove={() => {
            if (!moving.current) {
              moving.current = true;
              if (animated) {
                // setShowActions(flyingToLocation || false);
                if (onStartMovingRegion) {
                  onStartMovingRegion();
                }
              }
            }
          }}
          onTouchEnd={() => {
            regionMoveCallbackRef.current = setTimeout(async () => {
              moving.current = false;
              if (onStopMovingRegion) {
                onStopMovingRegion();
              }
            }, 300);
          }}
          onTouchCancel={() => {
            regionMoveCallbackRef.current = setTimeout(async () => {
              moving.current = false;
              if (onStopMovingRegion) {
                onStopMovingRegion();
              }
            }, 300);
          }}
          onRegionWillChange={() => {
            if (regionMoveCallbackRef.current) {
              clearTimeout(regionMoveCallbackRef.current);
              regionMoveCallbackRef.current = undefined;
            } else if (animated) {
              //  setShowActions(flyingToLocation || false);
            }
          }}
          onRegionIsChanging={feature => regionSubject.next(feature.properties)}
          onRegionDidChange={feature => {
            if (animated) {
              moving.current = false;
              if (onStopMovingRegion) {
                onStopMovingRegion();
              }
              //   setShowActions(true);
              if (onRegionChanged) {
                onRegionChanged(feature.properties);
              }
            }
          }}
          onDidFinishLoadingMap={async () => {
            if (!bounds) {
              let position = services.location.getLastKnownLocation();
              if (!contains(FR_BBOX, position)) {
                position = DEFAULT_TLS;
              }
              cameraRef.current?.setCamera({
                centerCoordinate: [position.lng, position.lat],
                zoomLevel: 10,
                animationDuration: 0
              });
            }
            setAnimated(true);
            AppLogger.debug("MAP", "loading done");
            if (onMapLoaded) {
              onMapLoaded();
            }
          }}
          rotateEnabled={false}
          pitchEnabled={false}
          style={styles.map}
          {...MapStyleProps}
          logoEnabled={false}
          attributionEnabled={false}>
          <MapLibreGL.Camera
            bounds={bounds}
            maxBounds={fromBoundingBox(FR_BBOX)}
            animationMode={animated ? "flyTo" : "moveTo"}
            maxZoomLevel={18}
            minZoomLevel={4}
            zoomLevel={10}
            // @ts-ignore
            ref={cameraRef}
          />
          <Images
            images={{
              //  pickup: rp_pickup_icon,
              rp: rp_icon,
              //    suggestion: rp_suggestion_icon,
              deposit: rp_deposit_icon,
              deposit_cluster: rp_deposit_cluster_icon
            }}
          />
          <MapControllerContext.Provider value={controller}>{children}</MapControllerContext.Provider>
          {showUserLocation && <UserLocation androidRenderMode="normal" />}
        </MapLibreGL.MapView>

        {showGeolocation && (
          <Column style={{ position: "absolute", bottom: 24, right: 10 }} spacing={8}>
            <AppPressableOverlay
              backgroundStyle={[{ borderRadius: 20, backgroundColor: AppColors.white }, AppStyles.shadow]}
              style={{ justifyContent: "center", alignItems: "center", height: 40, width: 40 }}>
              <AppIcon name={"people-outline"} size={22} style={{ justifyContent: "center", alignItems: "center" }} color={AppColors.primaryColor} />
            </AppPressableOverlay>

            <PositionButton
              //locationEnabled={showUserLocation}
              onPosition={async currentLocation => {
                if (!contains(FR_BBOX, currentLocation)) {
                  displayInfo("Désolé, Liane n'est pas disponible sur votre territoire.");
                  return;
                }
                setShowUserLocation(true);
                const currentCenter = await mapRef.current?.getCenter()!;
                const currentZoom = await mapRef.current?.getZoom()!;
                const targetCoord = [currentLocation.lng, currentLocation.lat];
                //setFlyingToLocation(true);
                if (Math.abs(12 - currentZoom) >= 1 || distance(currentCenter, targetCoord) > 1) {
                  cameraRef.current?.setCamera({
                    centerCoordinate: targetCoord,
                    zoomLevel: 12,
                    animationMode: "flyTo",
                    animationDuration: 1000
                  });
                  await new Promise(resolve => setTimeout(resolve, 1250));
                } else {
                  cameraRef.current?.flyTo(targetCoord);
                }
                //setFlyingToLocation(false);
              }}
              onPositionError={() => setShowUserLocation(false)}
            />
          </Column>
        )}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            paddingHorizontal: 2,
            backgroundColor: "rgba(255,255,255,0.6)",
            borderTopRightRadius: 2
          }}>
          <MapTilerLogo width={64} height={18} />
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            paddingLeft: 2,
            paddingRight: 8,
            backgroundColor: "rgba(255,255,255,0.6)",
            borderTopLeftRadius: 2
          }}>
          <Row spacing={4}>
            <AppText style={{ fontSize: 10 }}>©MapTiler</AppText>
            <AppText style={{ fontSize: 10 }}>©OpenStreetMap</AppText>
          </Row>
        </View>
      </View>
    );
  }
);

export default AppMapView;
export const MarkerView: ComponentType<MarkerViewProps & PropsWithChildren> = MapLibreGL.MarkerView;

const styles = StyleSheet.create({
  map: {
    flex: 1,
    flexDirection: "row"
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
  blackOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0
  },
  footerContainer: {
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
