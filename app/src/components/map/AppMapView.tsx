import React, { ForwardedRef, forwardRef, PropsWithChildren, useContext, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ColorValue, StyleSheet, View } from "react-native";
import MapLibreGL, { Logger } from "@maplibre/maplibre-react-native";
import { getPoint, isExactMatch, LatLng, Liane, LianeDisplay, LianeSegment, RallyingPoint } from "@/api";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { GeoJSON } from "geojson";
import { DEFAULT_TLS, FR_BBOX, MapStyleProps } from "@/api/location";
import { PositionButton } from "@/components/map/PositionButton";
import { AppContext } from "@/components/ContextProvider";
import { DisplayBoundingBox, fromBoundingBox } from "@/util/geometry";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { contains } from "@/api/geo";
import Animated, { SlideInLeft, SlideOutLeft } from "react-native-reanimated";
import { HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import { useQuery } from "react-query";
import { getTripMatch } from "@/components/trip/trip";
import PointAnnotation = MapLibreGL.PointAnnotation;
import MarkerView = MapLibreGL.MarkerView;
import ShapeSource = MapLibreGL.ShapeSource;
import LineLayer = MapLibreGL.LineLayer;
import { TouchableProps } from "react-native-svg";
import { GenericTouchableProps } from "react-native-gesture-handler/lib/typescript/components/touchables/GenericTouchable";

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
  setCenter: (position: LatLng, zoom?: number) => Promise<void> | undefined;

  getVisibleBounds: () => Promise<GeoJSON.Position[]> | undefined;

  fitBounds: (bbox: DisplayBoundingBox) => void;

  getZoom: () => Promise<number> | undefined;
}
// @ts-ignore
const MapControllerContext = React.createContext<AppMapViewController>();

export interface AppMapViewProps extends PropsWithChildren {
  // position: LatLng;
  onRegionChanged?: (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: GeoJSON.Position[] }) => void;
  onStartMovingRegion?: () => void;
  onStopMovingRegion?: () => void;
  onSelectLocation?: (point: LatLng) => void;
  showGeolocation?: boolean;
  bounds?: DisplayBoundingBox | undefined;
}

export const LianeMatchRouteLayer = () => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const { services } = useContext(AppContext);
  const match = state.context.selectedMatch!;
  const to = state.context.filter.to;
  const from = state.context.filter.from;
  const fromPoint = getPoint(match, "pickup");
  const toPoint = getPoint(match, "deposit");
  const isSamePickup = !from || from.id === fromPoint.id;
  const isSameDeposit = !to || to.id === toPoint.id;

  const wayPoints = useMemo(() => {
    const isCompatibleMatch = !isExactMatch(match.match);
    const trip = getTripMatch(
      toPoint,
      fromPoint,
      match.liane.wayPoints,
      match.liane.departureTime,
      isCompatibleMatch ? match.match.wayPoints : match.liane.wayPoints
    );
    return trip.wayPoints.slice(trip.departureIndex, trip.arrivalIndex + 1);
  }, [fromPoint, match, toPoint]);

  const { data, isLoading } = useQuery(`match_${from?.id!}_${to?.id!}_#${match.liane.id!}`, () => {
    const wp = [...(isSamePickup ? [] : [from!.location]), ...wayPoints.map(w => w.rallyingPoint.location), ...(isSameDeposit ? [] : [to!.location])];
    return services.routing.getRoute(wp);
  });

  const mapFeatures: GeoJSON.FeatureCollection | undefined = useMemo(() => {
    if (!data || data.geometry.coordinates.length === 0) {
      return undefined;
    }

    const features = {
      type: "FeatureCollection",
      features: data.geometry.coordinates.map((line, i): GeoJSON.Feature => {
        return {
          type: "Feature",
          properties: {
            isWalk: (!isSamePickup && i === 0) || (!isSameDeposit && i === data.geometry.coordinates.length - 1)
          },
          geometry: {
            type: "LineString",
            coordinates: line
          }
        };
      })
    };
    /*    const points = data.geometry.coordinates.map(g => g[0]);
    const lastSegment = data.geometry.coordinates[data.geometry.coordinates.length - 1];
    points.push(lastSegment[lastSegment.length - 1]);
    features.features = [
      ...features.features,
      ...points.map(
        (p, i): GeoJSON.Feature => ({
          type: "Feature",
          properties: {
            isTrip: !((!isSamePickup && i === 0) || (!isSameDeposit && i === points.length - 1))
          },
          geometry: {
            type: "Point",
            coordinates: p
          }
        })
      )
    ];*/
    return features;
  }, [data, isSameDeposit, isSamePickup]);

  if (!mapFeatures || isLoading) {
    return <LianeDisplayLayer lianeDisplay={state.context.lianeDisplay} loading={true} useWidth={3} />;
  }

  return (
    <ShapeSource id={"match_trip_source"} shape={mapFeatures}>
      <LineLayer
        id={"match_route_display"}
        filter={["!", ["get", "isWalk"]]}
        style={{
          lineColor: AppColors.darkBlue,
          lineWidth: 3
        }}
      />
      <LineLayer
        id={"match_remainder_display"}
        filter={["get", "isWalk"]}
        style={{
          lineColor: AppColorPalettes.gray[800],
          lineWidth: 3,
          lineCap: "round",
          lineDasharray: [0, 2]
        }}
      />
      {/* <CircleLayer
          id={"match_rp_display"}
          style={{
            circleColor: ["case", ["get", "myFeatureProperty"], AppColors.darkBlue, AppColorPalettes.gray[400]],
            circleRadius: 5,
            circleStrokeWidth: 2,
            circleStrokeColor: AppColors.white
          }}
        />*/}
    </ShapeSource>
  );
};

export const LianeDisplayLayer = ({
  loading = false,
  lianeDisplay,
  useWidth
}: {
  loading?: boolean;
  lianeDisplay: LianeDisplay | undefined;
  useWidth?: number | undefined;
}) => {
  const features = useMemo(() => {
    let segments = lianeDisplay?.segments ?? [];
    return toFeatureCollection(segments, lianeDisplay?.lianes ?? []);
  }, [lianeDisplay]);

  return (
    <MapLibreGL.ShapeSource id="segments" shape={features}>
      <MapLibreGL.LineLayer
        belowLayerID="place"
        id="segmentLayer"
        style={{ lineColor: loading ? AppColorPalettes.gray[400] : ["get", "color"], lineWidth: useWidth ? 3 : ["get", "width"] }}
      />
    </MapLibreGL.ShapeSource>
  );
};

export const RallyingPointsDisplayLayer = ({
  rallyingPoints,
  onSelect
}: {
  rallyingPoints: RallyingPoint[];
  onSelect?: (r: RallyingPoint | undefined) => void;
}) => {
  const feature = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: rallyingPoints.map((rp, i) => {
        return {
          type: "Feature",
          properties: {
            name: rp.label,
            id: rp.id,
            index: i
            //  color: selected === rp.id ? AppColors.blue : AppColors.orange
          },
          geometry: {
            type: "Point",
            coordinates: [rp.location.lng, rp.location.lat]
          }
        };
      })
    };
  }, [rallyingPoints]);
  const controller = useContext<AppMapViewController>(MapControllerContext);
  return (
    <MapLibreGL.ShapeSource
      id="rp_l"
      shape={feature}
      cluster={true}
      clusterMaxZoomLevel={11}
      clusterRadius={35}
      onPress={async f => {
        console.debug("clc", f, f.features[0]!.properties);
        const rp = f.features[0]!.properties!.point_count ? undefined : rallyingPoints[f.features[0]!.properties!.index!];

        const center = rp ? rp.location : { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
        const zoom = await controller.getZoom()!;

        await controller.setCenter(center, zoom < 12 ? (rp ? 12 : zoom + 1.25) : undefined);

        if (onSelect) {
          onSelect(zoom >= 12 ? rp : undefined);
        }
      }}>
      <MapLibreGL.CircleLayer
        id="rp_circles_clustered"
        filter={["has", "point_count"]}
        style={{
          circleColor: AppColors.blue,
          circleRadius: 16,
          circleRadius: ["step", ["get", "point_count"], 14, 3, 16, 10, 18],
          circleStrokeColor: AppColors.white,
          circleStrokeWidth: 1
        }}
      />
      <MapLibreGL.SymbolLayer
        id="rp_symbols_clustered"
        filter={["has", "point_count"]}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: AppColors.white,
          textHaloWidth: 1.2,
          textAllowOverlap: true,
          textField: "{point_count}",
          visibility: "visible"
        }}
      />
      <MapLibreGL.CircleLayer
        id="rp_circles"
        filter={["!", ["has", "point_count"]]}
        style={{
          circleColor: ["step", ["zoom"], AppColors.blue, 12, AppColors.orange],
          circleRadius: ["step", ["zoom"], 5, 12, 10],
          circleStrokeColor: AppColors.white,
          circleStrokeWidth: ["step", ["zoom"], 1, 12, 2]
        }}
      />

      <MapLibreGL.SymbolLayer
        id="rp_labels"
        filter={["!", ["has", "point_count"]]}
        minZoomLevel={12}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: AppColors.orange,
          textHaloWidth: 1.2,
          textField: "{name}",
          textAllowOverlap: false,
          textAnchor: "bottom",
          textOffset: [0, -1.2],
          textMaxWidth: 5.4,
          visibility: "visible"
        }}
      />
    </MapLibreGL.ShapeSource>
  );
};
export const RallyingPointsDisplay = ({
  rallyingPoint,
  selected = false,
  onSelect
}: {
  rallyingPoint: RallyingPoint;
  selected?: boolean;
  onSelect?: () => void;
}) => {
  return (
    <PointAnnotation
      id={rallyingPoint.id!}
      coordinate={[rallyingPoint.location.lng, rallyingPoint.location.lat]}
      onSelected={async () => {
        console.debug("sel", rallyingPoint.id, selected);
        if (onSelect) {
          onSelect();
        }
      }}>
      <View
        style={{
          height: 20,
          width: 20,
          backgroundColor: selected ? AppColors.blue : AppColors.orange,
          borderRadius: 48,
          borderColor: AppColors.white,
          borderWidth: 2
        }}
      />
    </PointAnnotation>
  );
};

export const WayPointDisplay = ({
  rallyingPoint,
  type,
  active = true
}: // showIcon = true
{
  rallyingPoint: RallyingPoint;
  type: "to" | "from" | "step" | "pickup" | "deposit";
  active?: boolean;
}) => {
  let color: ColorValue = AppColors.darkBlue;
  let icon;

  switch (type) {
    case "to":
      icon = <AppIcon name={"flag"} color={active ? AppColors.pink : AppColors.black} size={14} />;
      break;
    case "from":
      icon = <AppIcon name={"pin"} color={active ? AppColors.orange : AppColors.black} size={14} />;
      break;
    case "pickup":
      icon = <AppCustomIcon name={"car"} color={active ? AppColors.orange : AppColors.black} size={14} />;
      break;
    case "deposit":
      icon = <AppCustomIcon name={"directions-walk"} color={active ? AppColors.pink : AppColors.black} size={14} />;
      break;
    default:
      icon = undefined;
  }
  if (!active) {
    color = AppColorPalettes.gray[400];
  }
  const showIcon = icon !== undefined;
  return (
    <MarkerView id={rallyingPoint.id!} coordinate={[rallyingPoint.location.lng, rallyingPoint.location.lat]}>
      <View
        style={{
          padding: 4,
          alignItems: "center",
          justifyContent: "center",
          width: type !== "step" && showIcon ? 24 : 8,
          height: type !== "step" && showIcon ? 24 : 8,
          backgroundColor: color,
          borderRadius: 48,
          borderColor: AppColors.white,
          borderWidth: 1
        }}>
        {showIcon && icon}
      </View>
    </MarkerView>
  );
};

const AppMapView = forwardRef(
  (
    { onRegionChanged, onStartMovingRegion, onStopMovingRegion, children, showGeolocation = false, bounds }: AppMapViewProps,
    ref: ForwardedRef<AppMapViewController>
  ) => {
    const { services } = useContext(AppContext);
    const mapRef = useRef<MapLibreGL.MapView>();
    const cameraRef = useRef<MapLibreGL.Camera>();
    const [animated, setAnimated] = useState(false);

    const controller: AppMapViewController = {
      setCenter: (p: LatLng, zoom?: number) => {
        const duration = 250;
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
      getVisibleBounds: () => mapRef.current?.getVisibleBounds(),
      getZoom: () => mapRef.current?.getZoom(),
      fitBounds: (bbox: DisplayBoundingBox, duration?: number) =>
        cameraRef.current?.fitBounds(bbox.ne, bbox.sw, [bbox.paddingTop, bbox.paddingRight, bbox.paddingBottom, bbox.paddingLeft], duration)
    };
    useImperativeHandle(ref, () => controller);

    return (
      <View style={styles.map}>
        <MapLibreGL.MapView
          ref={mapRef}
          onRegionWillChange={() => {
            if (onStartMovingRegion && animated) {
              onStartMovingRegion();
            }
          }}
          onTouchCancel={() => {
            /* if (onStopMovingRegion) {
              onStopMovingRegion();
            } */
            //TODO try to improve
          }}
          onRegionDidChange={feature => {
            if (onRegionChanged && animated) {
              onRegionChanged(feature.properties);
            }
          }}
          onDidFinishLoadingMap={async () => {
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
          }}
          rotateEnabled={false}
          style={styles.map}
          {...MapStyleProps}
          logoEnabled={false}
          attributionEnabled={false}>
          <MapLibreGL.Camera
            bounds={bounds}
            maxBounds={fromBoundingBox(FR_BBOX)}
            animationMode={animated ? "flyTo" : "moveTo"}
            maxZoomLevel={15}
            minZoomLevel={5}
            zoomLevel={10}
            ref={cameraRef}
          />
          <MapControllerContext.Provider value={controller}>{children}</MapControllerContext.Provider>
        </MapLibreGL.MapView>
        {showGeolocation && (
          <Animated.View entering={SlideInLeft.delay(200)} exiting={SlideOutLeft} style={styles.mapOverlay}>
            <PositionButton
              onPosition={async currentLocation => {
                if (!contains(FR_BBOX, currentLocation)) {
                  currentLocation = DEFAULT_TLS;
                }
                cameraRef.current?.flyTo([currentLocation.lng, currentLocation.lat]);
              }}
            />
          </Animated.View>
        )}
      </View>
    );
  }
);

const toFeatureCollection = (lianeSegments: LianeSegment[], _: Liane[]): GeoJSON.FeatureCollection => {
  //const x = new Set(containedLianes.map(l => l.id));
  return {
    type: "FeatureCollection",
    features: lianeSegments.map(s => {
      return {
        type: "Feature",
        properties: {
          width: Math.min(5, s.lianes.length), // TODO categorize
          color: AppColors.darkBlue //s.lianes.filter(l => x.has(l)).length > 0 ? AppColors.orange : AppColors.darkBlue
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

    paddingVertical: 12,
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
