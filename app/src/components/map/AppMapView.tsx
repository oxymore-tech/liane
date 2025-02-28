import React, { ForwardedRef, forwardRef, PropsWithChildren, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import MapLibreGL, { CameraRef, Logger, MapViewRef, RegionPayload } from "@maplibre/maplibre-react-native";
import { DEFAULT_TLS, DisplayBoundingBox, getMapStyleUrl, LatLng } from "@liane/common";
import { AppColorPalettes } from "@/theme/colors";
import { Point, Position } from "geojson";
import { SubscriptionLike } from "rxjs";
import { RNAppEnv } from "@/api/env";
import { useSubject } from "@/util/hooks/subscription";
import { AppContext } from "@/components/context/ContextProvider.tsx";
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
  setCenter: (position: LatLng, zoom?: number, animationDuration?: number) => void;
  fitBounds: (b: DisplayBoundingBox, animationDuration?: number) => void;
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
  userLocation?: LatLng;
  bounds?: DisplayBoundingBox | undefined;
  onMapLoaded?: () => void;
  onLongPress?: ((coordinates: Position) => void) | undefined;
  onPress?: ((coordinates: Position) => void) | undefined;
  cameraPadding?: number;
}

const AppMapView = forwardRef(
  (
    { onRegionChanged, children, userLocation, bounds, onLongPress, onPress, cameraPadding }: AppMapViewProps,
    ref: ForwardedRef<AppMapViewController>
  ) => {
    const mapRef = useRef<MapViewRef>(null);
    const cameraRef = useRef<CameraRef>(null);
    const { services } = useContext(AppContext);

    const regionSubject = useSubject<RegionPayload>();

    const controller: AppMapViewController = useMemo(() => {
      return {
        getCenter: () => mapRef.current?.getCenter(),
        setCenter: (p: LatLng, zoom?: number, animationDuration = 200) => {
          cameraRef.current?.setCamera({
            centerCoordinate: [p.lng, p.lat],
            zoomLevel: zoom,
            padding: {
              paddingBottom: cameraPadding ?? 0
            },
            animationDuration
          });
        },
        fitBounds: (b: DisplayBoundingBox, animationDuration = 200) => {
          cameraRef?.current?.fitBounds(b.ne, b.sw, [b.paddingTop, b.paddingRight, b.paddingBottom, b.paddingLeft], animationDuration);
        },
        getVisibleBounds: () => mapRef.current?.getVisibleBounds(),
        getZoom: () => mapRef.current?.getZoom(),
        subscribeToRegionChanges: callback => regionSubject.subscribe(callback)
      };
    }, [cameraPadding, regionSubject]);

    useImperativeHandle(ref, () => controller);

    useEffect(() => {
      const initialCenter = userLocation ?? services.location.getLastKnownLocation() ?? DEFAULT_TLS;
      controller.setCenter(initialCenter, 10);
    }, [controller, services.location, userLocation]);

    useEffect(() => {
      if (!bounds) {
        return;
      }
      controller?.fitBounds(bounds);
    }, [controller, bounds]);

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
      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={getMapStyleUrl(RNAppEnv)}
        onLongPress={onLongPress ? e => onLongPress((e.geometry as Point).coordinates) : undefined}
        onPress={onPress ? e => onPress((e.geometry as Point).coordinates) : undefined}
        onRegionDidChange={handleRegionMoved}
        // @ts-ignore
        onTouchEnd={() => {
          cameraRef.current?.setCamera({ centerCoordinate: undefined, padding: { paddingBottom: cameraPadding } });
        }}
        rotateEnabled={false}
        pitchEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}>
        <Images
          images={{
            rp: rp_icon,
            deposit: rp_deposit_icon,
            deposit_cluster: rp_deposit_cluster_icon
          }}
        />
        <MapLibreGL.Camera ref={cameraRef} />
        <MapControllerContext.Provider value={controller}>{children}</MapControllerContext.Provider>
        {userLocation && <UserLocation androidRenderMode="normal" />}
      </MapLibreGL.MapView>
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
