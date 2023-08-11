import React, {
  ComponentType,
  ForwardedRef,
  forwardRef,
  PropsWithChildren,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import MapLibreGL, { Expression, Logger, MarkerViewProps } from "@maplibre/maplibre-react-native";
import { LatLng } from "@/api";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { FeatureCollection, Position } from "geojson";
import { DEFAULT_TLS, FR_BBOX, MapStyleProps } from "@/api/location";
import { PositionButton } from "@/components/map/PositionButton";
import { AppContext } from "@/components/context/ContextProvider";
import { DisplayBoundingBox, fromBoundingBox } from "@/util/geometry";
import { contains } from "@/api/geo";
import Animated, { SlideInLeft, SlideOutLeft } from "react-native-reanimated";
import { AppStyles } from "@/theme/styles";
import distance from "@turf/distance";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import MapTilerLogo from "@/assets/images/maptiler-logo.svg";
import DeviceInfo from "react-native-device-info";
import Images = MapLibreGL.Images;
import UserLocation = MapLibreGL.UserLocation;

const rp_pickup_icon = require("../../../assets/icons/rp_orange.png");
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
}
// @ts-ignore
const MapControllerContext = React.createContext<AppMapViewController>();

export const useAppMapViewController = () => useContext<AppMapViewController>(MapControllerContext);
export interface AppMapViewProps extends PropsWithChildren {
  // position: LatLng;
  onRegionChanged?: (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: GeoJSON.Position[] }) => void;
  onStartMovingRegion?: () => void;
  onStopMovingRegion?: () => void;
  onSelectFeatures?: (features: { location: LatLng; properties: any }[]) => void;
  showGeolocation?: boolean;
  bounds?: DisplayBoundingBox | undefined;
  onMapLoaded?: () => void;
}

const AppMapView = forwardRef(
  (
    {
      onRegionChanged,
      onStartMovingRegion,
      children,
      showGeolocation = false,
      bounds,
      onMapLoaded,
      onStopMovingRegion,
      onSelectFeatures
    }: AppMapViewProps,
    ref: ForwardedRef<AppMapViewController>
  ) => {
    const { services } = useContext(AppContext);
    const mapRef = useRef<MapLibreGL.MapView>();
    const cameraRef = useRef<MapLibreGL.Camera>();
    const [animated, setAnimated] = useState(false);
    const [showActions, setShowActions] = useState(showGeolocation);

    const wd = useWindowDimensions();
    const scale = Platform.OS === "android" ? wd.scale : 1;

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
        cameraRef.current?.fitBounds(bbox.ne, bbox.sw, [bbox.paddingTop, bbox.paddingRight, bbox.paddingBottom, bbox.paddingLeft], duration)
    };

    useImperativeHandle(ref, () => controller);
    const regionMoveCallbackRef = useRef<number | undefined>();
    const moving = useRef<boolean>(false);

    const [showUserLocation, setShowUserLocation] = useState(false);
    const [flyingToLocation, setFlyingToLocation] = useState(false);
    useEffect(() => {
      DeviceInfo.isLocationEnabled().then(setShowUserLocation);
    }, []);

    return (
      <View style={styles.map}>
        <MapLibreGL.MapView
          // @ts-ignore
          ref={mapRef}
          onTouchMove={() => {
            if (!moving.current) {
              moving.current = true;
              if (animated) {
                setShowActions(flyingToLocation || false);
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
              setShowActions(flyingToLocation || false);
            }
          }}
          onRegionDidChange={feature => {
            if (animated) {
              moving.current = false;
              if (onStopMovingRegion) {
                onStopMovingRegion();
              }
              setShowActions(true);
              if (onRegionChanged) {
                onRegionChanged(feature.properties);
              }
            }
          }}
          onDidFinishLoadingMap={async () => {
            //   await mapRef.current?.setSourceVisibility(false, "maptiler_planet", "poi");
            let position = services.location.getLastKnownLocation();
            if (!contains(FR_BBOX, position)) {
              position = DEFAULT_TLS;
            }
            cameraRef.current?.setCamera({
              centerCoordinate: [position.lng, position.lat],
              zoomLevel: 10,
              animationDuration: 0
            });
            setAnimated(true);
            console.debug("[MAP] loading done");
            if (onMapLoaded) {
              onMapLoaded();
            }
          }}
          rotateEnabled={false}
          pitchEnabled={false}
          style={styles.map}
          {...MapStyleProps}
          logoEnabled={false}
          onPress={async f => {
            if (__DEV__ && "coordinates" in f.geometry) {
              //console.debug(JSON.stringify(f.geometry.coordinates));
              //@ts-ignore
              const pointInView = await mapRef.current?.getPointInView(f.geometry.coordinates)!;
              //console.debug(wd.width, wd.height, wd.scale, JSON.stringify(pointInView));
              /*const q = await mapRef.current?.queryRenderedFeaturesInRect(
                [(pointInView[1] + 16) * scale, (pointInView[0] + 16) * scale, (pointInView[1] - 16) * scale, (pointInView[0] - 16) * scale],
                ["==", ["geometry-type"], "Point"],
                ["poi", "place", "town", "city", "airport", "parking", "station"]
              );*/

              const q = await mapRef.current?.queryRenderedFeaturesAtPoint(
                pointInView,
                ["==", ["geometry-type"], "Point"],
                ["poi", "place", "town", "city", "airport", "parking", "station"]
              );

              if (q) {
                const features = q.features.map(feat => ({
                  //@ts-ignore
                  location: { lat: feat.geometry.coordinates[1], lng: feat.geometry.coordinates[0] },
                  properties: feat.properties
                }));
                if (onSelectFeatures) {
                  onSelectFeatures(features);
                }
                console.debug("[MAP]", JSON.stringify(features));
              }
            }
          }}
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
              pickup: rp_pickup_icon,
              rp: rp_icon,
              //    suggestion: rp_suggestion_icon,
              deposit: rp_deposit_icon,
              deposit_cluster: rp_deposit_cluster_icon
            }}
          />
          <MapControllerContext.Provider value={controller}>{children}</MapControllerContext.Provider>
          {showUserLocation && <UserLocation androidRenderMode="normal" />}
        </MapLibreGL.MapView>
        {showGeolocation && showActions && (
          <Animated.View entering={SlideInLeft.delay(200)} exiting={SlideOutLeft} style={[styles.mapOverlay, AppStyles.shadow]}>
            <Column spacing={8}>
              <PositionButton
                //locationEnabled={showUserLocation}
                onPosition={async currentLocation => {
                  if (!contains(FR_BBOX, currentLocation)) {
                    return;
                  }
                  setShowUserLocation(true);
                  const currentCenter = await mapRef.current?.getCenter()!;
                  const currentZoom = await mapRef.current?.getZoom()!;
                  const targetCoord = [currentLocation.lng, currentLocation.lat];
                  setFlyingToLocation(true);
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
                  setFlyingToLocation(false);
                }}
                onPositionError={() => setShowUserLocation(false)}
              />
            </Column>
          </Animated.View>
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
  mapOverlay: {
    backgroundColor: AppColors.white,
    margin: 16,

    paddingVertical: 6,
    position: "absolute",
    left: 0,

    alignSelf: "center",
    borderRadius: 16
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
