import MapLibreGL from "@maplibre/maplibre-react-native";
import { MapStyle } from "@/api/location";
import { WithFetchResource } from "@/components/base/WithFetchResource";
import { Liane, WayPoint } from "@/api";
import React from "react";
import { getBoundingBox } from "@/util/geometry";
import { View } from "react-native";
import { Route } from "@/api/service/routing";
import { AppIcon } from "@/components/base/AppIcon";

const TripMapView = ({ data, params }: { data: Route; params: { liane: Liane } }) => {
  const boundingBox = getBoundingBox(data.geometry.coordinates.flat(), 24);
  const liane: Liane = params.liane;

  const destinationWayPoint = liane.wayPoints[liane.wayPoints.length - 1];
  // const departureWayPoint = liane.wayPoints[0];
  const displayedWayPoints = liane.wayPoints.slice(0, liane.wayPoints.length - 1);
  return (
    <MapLibreGL.MapView
      style={{ height: 160, width: "100%" }}
      styleJSON={MapStyle}
      logoEnabled={false}
      rotateEnabled={false}
      scrollEnabled={false}
      zoomEnabled={false}
      attributionEnabled={false}>
      <MapLibreGL.Camera bounds={boundingBox} animationMode={"moveTo"} />
      <MapLibreGL.ShapeSource id="line1" shape={data.geometry}>
        <MapLibreGL.LineLayer id="tripLayer" style={{ lineColor: "red", lineWidth: 2 }} />
      </MapLibreGL.ShapeSource>
      {displayedWayPoints.map(point => {
        return (
          <MapLibreGL.MarkerView
            coordinate={[point.rallyingPoint.location.lng, point.rallyingPoint.location.lat]}
            id={point.rallyingPoint.id!}
            key={point.rallyingPoint.id!}>
            <View style={{ backgroundColor: "red", width: 6, height: 6, borderRadius: 6 }} />
          </MapLibreGL.MarkerView>
        );
      })}
      <MapLibreGL.MarkerView
        key={destinationWayPoint.rallyingPoint.id!}
        coordinate={[destinationWayPoint.rallyingPoint.location.lng, destinationWayPoint.rallyingPoint.location.lat]}
        id={destinationWayPoint.rallyingPoint.id!}>
        <View style={{ position: "absolute", paddingLeft: 12, paddingBottom: 12 }}>
          <AppIcon name={"flag"} color={"red"} size={24} />
        </View>
      </MapLibreGL.MarkerView>
    </MapLibreGL.MapView>
  );
};

const LianeRouteQueryKey = "LianeDisplay";
export const TripOverview = WithFetchResource(
  TripMapView,
  (repository, params: { liane: Liane }) => repository.routing.getRoute(params.liane.wayPoints.map(w => w.rallyingPoint.location)),
  params => `${LianeRouteQueryKey}_${params.liane.id}`
);

/** Liane Match overview **/

const TripChangeMapView = ({ data, params }: { data: LianeMatchRoutesGeometry; params: { liane: Liane; newWayPoints: WayPoint[] } }) => {
  console.log(data);
  const boundingBox = getBoundingBox(data.newRoute.geometry.coordinates.flat(), 24);

  const destinationWayPoint = params.newWayPoints[params.newWayPoints.length - 1];
  const departureWayPoint = params.newWayPoints[0];
  const displayedWayPoints = params.newWayPoints.slice(0, params.newWayPoints.length - 1);

  return (
    <MapLibreGL.MapView
      style={{ height: 160, width: "100%" }}
      styleJSON={MapStyle}
      logoEnabled={false}
      rotateEnabled={false}
      scrollEnabled={false}
      zoomEnabled={false}
      attributionEnabled={false}>
      <MapLibreGL.Camera bounds={boundingBox} animationMode={"moveTo"} />
      <MapLibreGL.ShapeSource id="line1" shape={data.originalRoute.geometry}>
        <MapLibreGL.LineLayer id="tripLayer" style={{ lineColor: "gray", lineWidth: 2 }} />
      </MapLibreGL.ShapeSource>
      <MapLibreGL.ShapeSource id="line2" shape={data.newRoute.geometry}>
        <MapLibreGL.LineLayer id="changeLayer" style={{ lineColor: "red", lineDasharray: [4, 2], lineWidth: 2 }} />
      </MapLibreGL.ShapeSource>
      {displayedWayPoints.map(point => {
        return (
          <MapLibreGL.MarkerView
            coordinate={[point.rallyingPoint.location.lng, point.rallyingPoint.location.lat]}
            key={point.rallyingPoint.id!}
            id={point.rallyingPoint.id!}>
            <View style={{ backgroundColor: "red", width: 6, height: 6, borderRadius: 6 }} />
          </MapLibreGL.MarkerView>
        );
      })}

      <MapLibreGL.MarkerView
        key={destinationWayPoint.rallyingPoint.id!}
        coordinate={[destinationWayPoint.rallyingPoint.location.lng, destinationWayPoint.rallyingPoint.location.lat]}
        id={destinationWayPoint.rallyingPoint.id!}>
        <View style={{ position: "absolute", paddingLeft: 12, paddingBottom: 12 }}>
          <AppIcon name={"flag"} color={"red"} size={24} />
        </View>
      </MapLibreGL.MarkerView>
    </MapLibreGL.MapView>
  );
};

const LianeMatchRouteQueryKey = "LianeMatchDisplay";

type LianeMatchRoutesGeometry = {
  originalRoute: Route;
  newRoute: Route;
};
export const TripChangeOverview = WithFetchResource(
  TripChangeMapView,
  async (repository, params: { liane: Liane; newWayPoints: WayPoint[] }): Promise<LianeMatchRoutesGeometry> => {
    const newRoute = await repository.routing.getRoute(params.newWayPoints.map(w => w.rallyingPoint.location));
    const originalRoute = await repository.routing.getRoute(params.liane.wayPoints.map(w => w.rallyingPoint.location));
    return { originalRoute, newRoute };
  },
  params => `${LianeMatchRouteQueryKey}_${params.liane.id}`
);