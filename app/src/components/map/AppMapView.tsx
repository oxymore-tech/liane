import React, {
  ForwardedRef,
  forwardRef,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import { StyleSheet, View } from "react-native";
import MapLibreGL, { CameraRef, Logger, MapViewRef, RegionPayload } from "@maplibre/maplibre-react-native";
import { DisplayBoundingBox, getMapStyleUrl, LatLng } from "@liane/common";
import { AppColorPalettes } from "@/theme/colors";
import { Point, Position } from "geojson";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import MapTilerLogo from "@/assets/images/maptiler-logo.svg";
import { SubscriptionLike } from "rxjs";
import { RNAppEnv } from "@/api/env";
import { useSubject } from "@/util/hooks/subscription";
import Images = MapLibreGL.Images;
import UserLocation = MapLibreGL.UserLocation;

const rp_icon = require("../../../assets/icons/rp_gray.png");
const rp_deposit_icon = require("../../../assets/icons/rp_pink.png");
const rp_deposit_cluster_icon = require("../../../assets/icons/rp_pink_blank.png");

Logger.setLogCallback(log => {
  const { message } = log;
  // expected warnings - see https://github.com/mapbox/mapbox-gl-native/issues/15341#issuecomment-522889062
  return !!(
    message.match("Request failed due to a permanent error: Canceled") ||
    message.match("Request failed due to a permanent error: Socket Closed") ||
    message.match("Request failed due to a permanent error: stream was reset: CANCEL")
  );
});

export type AppMapViewController = {
  setCenter: (position: LatLng, zoom?: number, duration?: number) => void;
  getVisibleBounds: () => Promise<GeoJSON.Position[]> | undefined;
  getZoom: () => Promise<number> | undefined;
  getCenter: () => Promise<Position> | undefined;
  subscribeToRegionChanges: (callback: (payload: RegionPayload) => void) => SubscriptionLike;
};
// @ts-ignore
const MapControllerContext = React.createContext<AppMapViewController>();

export const useAppMapViewController = () => useContext<AppMapViewController>(MapControllerContext);

export type MapMovedCallback = (payload: {
  zoomLevel: number;
  isUserInteraction: boolean;
  visibleBounds: GeoJSON.Position[];
  center: Position;
}) => void;
export interface AppMapViewProps extends PropsWithChildren {
  onRegionChanged?: MapMovedCallback;
  onStartMovingRegion?: () => void;
  onStopMovingRegion?: () => void;
  extra?: ReactNode;
  userLocation?: LatLng;
  bounds?: DisplayBoundingBox | undefined;
  onMapLoaded?: () => void;
  onLongPress?: ((coordinates: Position) => void) | undefined;
  onPress?: ((coordinates: Position) => void) | undefined;
  cameraPadding?: number;
}

const AppMapView = forwardRef(
  (
    { onRegionChanged, children, extra, userLocation, bounds, onLongPress, onPress, cameraPadding }: AppMapViewProps,
    ref: ForwardedRef<AppMapViewController>
  ) => {
    const mapRef = useRef<MapViewRef>(null);
    const cameraRef = useRef<CameraRef>(null);

    const regionSubject = useSubject<RegionPayload>();

    const [appliedCenter, setAppliedCenter] = useState<LatLng | undefined>(userLocation);

    const controller: AppMapViewController = useMemo(() => {
      return {
        getCenter: () => mapRef.current?.getCenter(),
        setCenter: (p: LatLng, zoom?: number, duration = 250) => {
          cameraRef.current?.setCamera({
            centerCoordinate: [p.lng, p.lat],
            zoomLevel: zoom,
            animationMode: "flyTo",
            animationDuration: duration,
            padding: {
              paddingBottom: cameraPadding ?? 0
            }
          });
        },
        getVisibleBounds: () => mapRef.current?.getVisibleBounds(),
        getZoom: () => mapRef.current?.getZoom(),
        subscribeToRegionChanges: callback => regionSubject.subscribe(callback)
      };
    }, [cameraPadding, regionSubject]);

    useImperativeHandle(ref, () => controller);

    useEffect(() => {
      setAppliedCenter(userLocation);
    }, [userLocation]);

    useEffect(() => {
      if (!appliedCenter) {
        return;
      }

      controller.setCenter(appliedCenter, 10);
      setAppliedCenter(appliedCenter);
    }, [controller, appliedCenter, setAppliedCenter]);

    const handleRegionMoved = useCallback(
      (feature: GeoJSON.Feature<GeoJSON.Point, RegionPayload>) => {
        if (onRegionChanged) {
          controller.getCenter()?.then(center => {
            onRegionChanged({ center, ...feature.properties });
          });
        }
      },
      [controller, onRegionChanged]
    );

    return (
      <View style={[styles.map]}>
        <MapLibreGL.MapView
          onLongPress={onLongPress ? e => onLongPress((e.geometry as Point).coordinates) : undefined}
          onPress={onPress ? e => onPress((e.geometry as Point).coordinates) : undefined}
          ref={mapRef}
          // @ts-ignore
          onTouchEnd={() => {
            cameraRef.current?.setCamera({ centerCoordinate: undefined, padding: { paddingBottom: cameraPadding } });
            setAppliedCenter(undefined);
          }}
          onRegionDidChange={handleRegionMoved}
          rotateEnabled={false}
          pitchEnabled={false}
          style={styles.map}
          mapStyle={getMapStyleUrl(RNAppEnv)}
          logoEnabled={false}
          attributionEnabled={false}>
          <MapLibreGL.Camera
            bounds={bounds}
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
          {userLocation && <UserLocation androidRenderMode="normal" />}
        </MapLibreGL.MapView>

        {extra}
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
export const MarkerView = MapLibreGL.MarkerView;

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
  },
  locationTop: {
    position: "absolute",
    right: 10,
    top: "50%",
    justifyContent: "flex-end"
  }
});
