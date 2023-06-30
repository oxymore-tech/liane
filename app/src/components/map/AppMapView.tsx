import React, { ForwardedRef, forwardRef, PropsWithChildren, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ColorValue, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import MapLibreGL, { Expression, Logger } from "@maplibre/maplibre-react-native";
import { Exact, getPoint, LatLng, LianeMatch, RallyingPoint, UnionUtils } from "@/api";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { FeatureCollection, GeoJSON, Position } from "geojson";
import { DEFAULT_TLS, FR_BBOX, MapStyleProps } from "@/api/location";
import { PositionButton } from "@/components/map/PositionButton";
import { AppContext } from "@/components/ContextProvider";
import { DisplayBoundingBox, fromBoundingBox, isFeatureCollection } from "@/util/geometry";
import { AppIcon } from "@/components/base/AppIcon";
import { contains } from "@/api/geo";
import Animated, { SlideInLeft, SlideOutLeft } from "react-native-reanimated";
import { useQuery } from "react-query";
import { getTripMatch } from "@/components/trip/trip";
import { AppStyles } from "@/theme/styles";
import { TilesUrl } from "@/api/http";
import MarkerView = MapLibreGL.MarkerView;
import ShapeSource = MapLibreGL.ShapeSource;
import LineLayer = MapLibreGL.LineLayer;
import Images = MapLibreGL.Images;
const rp_pickup_icon = require("../../../assets/icons/rp_orange.png");
const rp_icon = require("../../../assets/icons/rp_gray.png");

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

  fitBounds: (bbox: DisplayBoundingBox, duration?: number) => void;

  getZoom: () => Promise<number> | undefined;

  getCenter: () => Promise<Position> | undefined;

  queryFeatures: (coordinate?: Position, filter?: Expression, layersId?: string[]) => Promise<FeatureCollection | undefined> | undefined;
}
// @ts-ignore
const MapControllerContext = React.createContext<AppMapViewController>();

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

export const PotentialLianeLayer = ({ from, to }: { from: RallyingPoint; to: RallyingPoint }) => {
  const { services } = useContext(AppContext);
  const { data } = useQuery(["match", from.id!, to.id!, undefined], () => {
    return services.routing.getRoute([from.location, to.location]);
  });
  return data ? (
    <ShapeSource id={"potential_trip_source"} shape={data.geometry}>
      <LineLayer
        id={"potential_route_display"}
        style={{
          lineColor: AppColorPalettes.gray[400],
          lineWidth: 3
        }}
      />
    </ShapeSource>
  ) : null;
};

export const LianeMatchRouteLayer = (props: { match: LianeMatch; to?: RallyingPoint; from?: RallyingPoint; loadingFeatures?: FeatureCollection }) => {
  const { services } = useContext(AppContext);
  const match = props.match;
  const fromPoint = getPoint(match, "pickup");
  const toPoint = getPoint(match, "deposit");
  const to = props.to || toPoint;
  const from = props.from || fromPoint;
  const isSamePickup = !from || from.id === fromPoint.id;
  const isSameDeposit = !to || to.id === toPoint.id;

  const wayPoints = useMemo(() => {
    const isCompatibleMatch = !UnionUtils.isInstanceOf<Exact>(match.match, "Exact");
    const trip = getTripMatch(
      toPoint,
      fromPoint,
      match.liane.wayPoints,
      match.liane.departureTime,
      isCompatibleMatch ? match.match.wayPoints : match.liane.wayPoints
    );
    return trip.wayPoints; //.slice(trip.departureIndex, trip.arrivalIndex + 1);
  }, [fromPoint, match, toPoint]);

  const { data, isLoading } = useQuery(["match", from?.id, to?.id!, match.liane.id!], () => {
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

    return features;
  }, [data, isSameDeposit, isSamePickup]);

  if (!mapFeatures || isLoading) {
    return <LianeDisplayLayer lianeDisplay={props.loadingFeatures} loading={true} useWidth={3} />;
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
    </ShapeSource>
  );
};

export const LianeDisplayLayer2 = ({
  date = new Date(),
  onSelect,
  pickupPoint
}: {
  date?: Date;
  onSelect?: (rp: RallyingPoint) => void;
  pickupPoint?: string | undefined;
}) => {
  const dateArg =
    "?offset=" +
    date.getTimezoneOffset() +
    "&day=" +
    date.getFullYear() +
    "-" +
    (1 + date.getMonth()).toString().padStart(2, "0") +
    "-" +
    date.getDate().toString().padStart(2, "0");
  const [sourceId, setSourceId] = useState("");
  useEffect(() => {
    setSourceId("segments" + dateArg + pickupPoint);
    console.debug("[MAP]: tile source", dateArg, pickupPoint);
  }, [dateArg, pickupPoint]);

  const controller = useContext<AppMapViewController>(MapControllerContext);
  const url = TilesUrl + (pickupPoint ? "/liane_display_filter" : "/liane_display") + dateArg + (pickupPoint ? "&pickup=" + pickupPoint : "");
  return (
    <MapLibreGL.VectorSource
      id={"segments"}
      url={url}
      key={sourceId}
      maxZoomLevel={14}
      onPress={
        onSelect
          ? async f => {
              console.debug(JSON.stringify(f));
              const points = f.features.filter(feat => feat.geometry.type === "Point");
              if (points.length > 0) {
                const p = points[0];
                console.debug("clc", p);
                const center = { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
                const zoom = await controller.getZoom()!;

                let newZoom;
                if (zoom < 10.5) {
                  newZoom = 12.1; //rp ? 12.1 : zoom + 1.5;
                } else if (zoom < 12) {
                  newZoom = 12.1;
                } else {
                  newZoom = undefined;
                }
                await controller.setCenter(center, newZoom);

                //@ts-ignore
                onSelect({ ...p!.properties!, location: center });
              }
            }
          : undefined
      }>
      {pickupPoint && (
        <MapLibreGL.LineLayer
          belowLayerID="place"
          id="lianeLayerFiltered"
          sourceLayerID="liane_display"
          style={{
            //@ts-ignore
            lineSortKey: ["get", "count"],
            lineCap: "round",
            lineColor: AppColors.darkBlue,
            lineWidth: 3
          }}
        />
      )}
      {!pickupPoint && (
        <MapLibreGL.LineLayer
          belowLayerID="place"
          id="lianeLayer"
          sourceLayerID="liane_display"
          style={{
            //@ts-ignore
            lineSortKey: ["get", "count"],
            lineCap: "round",
            lineColor: ["interpolate", ["linear"], ["get", "count"], 1, "#46516e", 2, AppColors.darkBlue, 5, "#8c2372"],
            lineWidth: ["step", ["get", "count"], 1, 2, 2, 3, 3, 4, 4, 5, 5]
          }}
        />
      )}

      <MapLibreGL.SymbolLayer
        id="rp_symbols"
        sourceLayerID={"rallying_point_display"}
        filter={pickupPoint ? ["!=", ["get", "id"], pickupPoint] : undefined}
        minZoomLevel={8}
        style={{
          symbolSortKey: ["case", ["==", ["get", "point_type"], "pickup"], 0, 1],
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: [
            "case",
            ["==", ["get", "point_type"], "pickup"],
            AppColors.orange,
            //["==", ["get", "point_type"], "suggestion"],
            "#000"
            //    mainColor
          ],
          textHaloColor: "#fff",
          textHaloWidth: 1.2,
          textField: ["step", ["zoom"], "", 12, ["get", "label"]],
          textAllowOverlap: false,
          textAnchor: "bottom",
          textOffset: [0, -3],
          textMaxWidth: 5.4,
          visibility: "visible",
          iconImage: ["case", ["==", ["get", "point_type"], "pickup"], "pickup", "rp"],
          iconAnchor: "bottom",
          iconSize: ["step", ["zoom"], 0.75, 12, 1]
        }}
      />
    </MapLibreGL.VectorSource>
  );
};

export const LianeDisplayLayer = ({
  loading = false,
  lianeDisplay,
  useWidth
}: {
  loading?: boolean;
  lianeDisplay: FeatureCollection | undefined;
  useWidth?: number | undefined;
}) => {
  /* const features = useMemo(() => {
    let segments = lianeDisplay?.segments ?? [];
    return toFeatureCollection(segments, lianeDisplay?.lianes ?? []);
  }, [lianeDisplay]);
*/
  console.log(lianeDisplay);
  const features = lianeDisplay || {
    type: "FeatureCollection",
    features: []
  };
  return (
    <MapLibreGL.ShapeSource id="segments" shape={features}>
      <MapLibreGL.LineLayer
        belowLayerID="place"
        id="lianeLayer"
        style={{
          lineColor: loading ? AppColorPalettes.gray[400] : AppColors.darkBlue,
          lineWidth: useWidth ? useWidth : ["step", ["length", ["get", "lianes"]], 1, 2, 2, 3, 3, 4, 4, 5, 5]
        }}
      />
    </MapLibreGL.ShapeSource>
  );
};

export interface RallyingPointsDisplayLayerProps {
  rallyingPoints: RallyingPoint[] | FeatureCollection;
  onSelect?: (r?: RallyingPoint) => void;
  cluster?: boolean;
  interactive?: boolean;
  minZoomLevel?: number | undefined;
  color?: ColorValue;
}

export const RallyingPointsDisplayLayer = ({
  rallyingPoints,
  onSelect,
  cluster = true,
  interactive = true,
  color = AppColors.orange,
  minZoomLevel
}: RallyingPointsDisplayLayerProps) => {
  const feature = useMemo(() => {
    if (isFeatureCollection(rallyingPoints)) {
      return {
        type: "FeatureCollection",
        features: rallyingPoints.features.filter(f => f.geometry.type === "Point")
      };
    }
    return {
      type: "FeatureCollection",
      features: rallyingPoints.map(rp => {
        return {
          type: "Feature",
          properties: rp,
          geometry: {
            type: "Point",
            coordinates: [rp.location.lng, rp.location.lat]
          }
        };
      })
    };
  }, [rallyingPoints]);
  const controller = useContext<AppMapViewController>(MapControllerContext);

  // @ts-ignore
  const mainColor: string = color;
  return (
    <MapLibreGL.ShapeSource
      id="rp_l"
      shape={feature}
      cluster={cluster}
      clusterMaxZoomLevel={10}
      clusterRadius={35}
      onPress={
        interactive
          ? async f => {
              //console.debug("clc", f, f.features[0]!.properties);
              const rp = f.features[0]!.properties!.point_count ? undefined : f.features[0]!.properties!;

              const center = rp ? rp.location : { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
              const zoom = await controller.getZoom()!;

              let newZoom;
              if (zoom < 10.5) {
                newZoom = rp ? 12.1 : zoom + 1.5;
              } else if (zoom < 12) {
                newZoom = 12.1;
              } else {
                newZoom = undefined;
              }
              await controller.setCenter(center, newZoom);

              if (onSelect) {
                onSelect(zoom >= 10.5 ? rp : undefined);
              }
            }
          : undefined
      }>
      <MapLibreGL.CircleLayer
        minZoomLevel={minZoomLevel}
        id="rp_circles_clustered"
        filter={["has", "point_count"]}
        style={{
          circleColor: mainColor,
          circleRadius: ["step", ["get", "point_count"], 14, 3, 16, 10, 18],
          circleStrokeColor: AppColors.white,
          circleStrokeWidth: 1
        }}
      />
      <MapLibreGL.SymbolLayer
        minZoomLevel={minZoomLevel}
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
        minZoomLevel={minZoomLevel}
        id="rp_circles"
        // belowLayerID="place"
        filter={["!", ["has", "point_count"]]}
        style={{
          circleColor: ["step", ["zoom"], mainColor, 12, mainColor],
          circleRadius: ["step", ["zoom"], 5, 12, 10],
          circleStrokeColor: AppColors.white,
          circleStrokeWidth: ["step", ["zoom"], 1, 12, 2]
        }}
      />

      <MapLibreGL.SymbolLayer
        id="rp_labels"
        filter={["!", ["has", "point_count"]]}
        minZoomLevel={minZoomLevel ? Math.max(12, minZoomLevel) : 12}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: mainColor,
          textHaloColor: "#fff",
          textHaloWidth: 1.2,
          textField: "{label}",
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

export const RallyingPointsDisplayLayer2 = ({
  onSelect,
  date,
  interactive = true,
  color = AppColors.orange
}: {
  onSelect?: (r?: RallyingPoint, lianes: { [liane_id: string]: "suggestion" | "pickup" }) => void;
  interactive?: boolean;
  color?: ColorValue;
  date?: Date | undefined;
}) => {
  const controller = useContext<AppMapViewController>(MapControllerContext);
  const dateArg = date ? "?day=" + date.toISOString().substring(0, "YYYY-MM-DD".length) + "&offset=" + date.getTimezoneOffset() : "";
  const [sourceId, setSourceId] = useState("");
  useEffect(() => {
    setSourceId("rallying_points" + dateArg);
  }, [dateArg]);
  // @ts-ignore
  const mainColor: string = color;

  return (
    <MapLibreGL.VectorSource
      id={"rallying_points"}
      key={sourceId}
      // TODO not working maxZoomLevel={12}
      minZoomLevel={8}
      url={TilesUrl + "/rallying_point_display" + dateArg}
      onPress={
        interactive
          ? async f => {
              console.debug("clc", f, f.features[0]);
              //   const rp = f.features[0]!.properties!.point_count ? undefined : f.features[0]!.properties!;

              const center = { lat: f.coordinates.latitude, lng: f.coordinates.longitude };
              const zoom = await controller.getZoom()!;

              let newZoom;
              if (zoom < 10.5) {
                newZoom = 12.1; //rp ? 12.1 : zoom + 1.5;
              } else if (zoom < 12) {
                newZoom = 12.1;
              } else {
                newZoom = undefined;
              }
              await controller.setCenter(center, newZoom);

              const linkedLianes = Object.fromEntries(
                Object.entries(f.features[0]!.properties!)
                  .filter(([k]) => k.startsWith("l_") && k.length === 26)
                  .map(([k, v]) => [k.substring(2), v])
              );

              if (onSelect) {
                //@ts-ignore
                onSelect({ ...f.features[0]!.properties!, location: center }, linkedLianes);
              }
            }
          : undefined
      }>
      <MapLibreGL.CircleLayer
        id="rp_circles"
        minZoomLevel={12}
        belowLayerID={"rp_circles_active"}
        sourceLayerID={"rallying_point_display"}
        style={{
          circleColor: "#46516e",
          circleRadius: ["step", ["zoom"], 5, 12, 10],
          circleStrokeColor: AppColors.white,
          circleStrokeWidth: ["step", ["zoom"], 1, 12, 2]
        }}
      />

      <MapLibreGL.SymbolLayer
        id="rp_labels"
        belowLayerID={"rp_labels_active"}
        sourceLayerID={"rallying_point_display"}
        minZoomLevel={12}
        style={{
          textFont: ["Open Sans Regular", "Noto Sans Regular"],
          textSize: 12,
          textColor: "#46516e",
          textHaloColor: "#fff",
          textHaloWidth: 1.2,
          textField: "{label}",
          textAllowOverlap: false,
          textAnchor: "bottom",
          textOffset: [0, -1.2],
          textMaxWidth: 5.4,
          visibility: "visible"
        }}
      />
    </MapLibreGL.VectorSource>
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
      icon = <AppIcon name={"car"} color={active ? AppColors.orange : AppColors.black} size={14} />;
      break;
    case "deposit":
      icon = <AppIcon name={"directions-walk"} color={active ? AppColors.pink : AppColors.black} size={14} />;
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
      setCenter: (p: LatLng, zoom?: number) => {
        const duration = 350;
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
          console.log(ne, sw);
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
    return (
      <View style={styles.map}>
        <MapLibreGL.MapView
          ref={mapRef}
          onTouchMove={() => {
            if (!moving.current) {
              moving.current = true;
              if (animated) {
                setShowActions(false);
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
              setShowActions(false);
              /*if (onStartMovingRegion) {
                onStartMovingRegion();
              }*/
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
            if ("coordinates" in f.geometry) {
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
            ref={cameraRef}
          />
          <Images images={{ pickup: rp_pickup_icon, rp: rp_icon }} />

          <MapControllerContext.Provider value={controller}>{children}</MapControllerContext.Provider>
        </MapLibreGL.MapView>
        {showGeolocation && showActions && (
          <Animated.View entering={SlideInLeft.delay(200)} exiting={SlideOutLeft} style={[styles.mapOverlay, AppStyles.shadow]}>
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
