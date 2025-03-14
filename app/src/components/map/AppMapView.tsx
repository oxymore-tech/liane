import React, {
  ForwardedRef,
  forwardRef,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import { Dimensions, Platform, StyleSheet } from "react-native";
import MapLibreGL, { CameraRef, Logger, MapViewRef, RegionPayload } from "@maplibre/maplibre-react-native";
import { BoundingBox, DEFAULT_TLS, DisplayBoundingBox, getMapStyleUrl, LatLng, toLatLng } from "@liane/common";
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

const getBBoxPolygon = (box?: BoundingBox) => {
  if (!box) {
    return [];
  }
  return [
    [box.min.lng, box.min.lat], // Sud-Ouest
    [box.max.lng, box.min.lat], // Sud-Est
    [box.max.lng, box.max.lat], // Nord-Est
    [box.min.lng, box.max.lat], // Nord-Ouest
    [box.min.lng, box.min.lat] // Retour au point de départ
  ];
};

// @ts-ignore
const MapControllerContext = React.createContext<AppMapViewController>();

export const useAppMapViewController = () => useContext<AppMapViewController>(MapControllerContext);

export type MapMovedCallback = (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: GeoJSON.Position[] }) => void;

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
  onBboxChanged?: (bbox: BoundingBox) => void;
}

// Convertit le padding vertical en décalage de latitude
const adjustCenterWithPadding = (position: LatLng, padding: number, zoom: number): LatLng => {
  const { height } = Dimensions.get("window");

  // Facteur d'échelle : combien de latitude par pixel en fonction du zoom
  const latPerPixel = 360 / (Math.pow(2, zoom) * height);

  // Décale la latitude vers le haut
  return {
    lat: position.lat - padding * latPerPixel,
    lng: position.lng
  };
};

/**
 * Get the square bouding box around the given center
 */
export function fromPositions2(bbox: Position[], center: Position, zoomLevel: number): BoundingBox {
  const margin = 0.02 * Math.pow(2, 10 - zoomLevel);
  const [upperLeft, bottomRight] = bbox;
  const delta = Math.abs(upperLeft[0] - bottomRight[0]) / 2 / Math.sqrt(2);

  return {
    max: toLatLng([upperLeft[0] - margin, upperLeft[1] - margin]),
    min: toLatLng([bottomRight[0] + margin, center[1] - delta + margin])
  };
}

const AppMapView = forwardRef(
  (
    { onRegionChanged, children, userLocation, bounds, onLongPress, onPress, cameraPadding, onBboxChanged }: AppMapViewProps,
    ref: ForwardedRef<AppMapViewController>
  ) => {
    const mapRef = useRef<MapViewRef>(null);
    const cameraRef = useRef<CameraRef>(null);
    const { services } = useContext(AppContext);

    const regionSubject = useSubject<RegionPayload>();

    const [bbox, setBbox] = useState<BoundingBox>();
    const [bboxAsString, setBboxAsString] = useState("");

    useEffect(() => {
      if (!bbox) {
        return;
      }
      if (!onBboxChanged) {
        return;
      }
      onBboxChanged(bbox);
    }, [bbox, onBboxChanged]);

    const controller: AppMapViewController = useMemo(() => {
      return {
        getCenter: () => mapRef.current?.getCenter(),
        setCenter: (p: LatLng, zoom: number = 10, animationDuration = 200) => {
          const adjustedPosition = cameraPadding ? adjustCenterWithPadding(p, cameraPadding / 2, zoom) : p;
          cameraRef.current?.setCamera({
            centerCoordinate: [adjustedPosition.lng, adjustedPosition.lat],
            zoomLevel: zoom,
            animationDuration
          });
          if (Platform.OS === "ios") {
            cameraRef.current?.flyTo([adjustedPosition.lng, adjustedPosition.lat], animationDuration);
          }
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
      // si on rajoute controller ça se met à jour trop souvent
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [services.location, userLocation]);

    useEffect(() => {
      if (!bounds) {
        return;
      }
      controller?.fitBounds(bounds);
      // si on rajoute controller ça se met à jour trop souvent
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bounds]);
    //
    // useEffect(() => {
    //   cameraRef.current?.setCamera({ padding: { paddingBottom: cameraPadding } });
    // }, [cameraPadding]);

    const handleRegionMoved = useCallback(
      async (feature: GeoJSON.Feature<GeoJSON.Point, RegionPayload>) => {
        if (onRegionChanged) {
          onRegionChanged(feature.properties);
        }
        const center = await mapRef.current?.getCenter();
        if (!center) {
          return;
        }
        const newBbox = fromPositions2(feature.properties.visibleBounds, center, feature.properties.zoomLevel);
        const value = JSON.stringify(newBbox);
        if (value === bboxAsString) {
          return;
        }
        setBboxAsString(value);
        setBbox(newBbox);
      },
      [bboxAsString, onRegionChanged]
    );

    const boundingBoxPolygon = useMemo(() => getBBoxPolygon(bbox), [bbox]);

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
          if (Platform.OS === "android") {
            cameraRef.current?.setCamera({ centerCoordinate: undefined });
          }
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
        {__DEV__ && boundingBoxPolygon.length > 0 && (
          <MapLibreGL.ShapeSource id="bbox" shape={{ type: "Polygon", coordinates: [boundingBoxPolygon] }}>
            <MapLibreGL.LineLayer
              id="bbox-line"
              style={{
                lineColor: "red",
                lineWidth: 2
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
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
