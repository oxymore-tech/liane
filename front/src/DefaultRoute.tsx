import { LatLngLiteral } from "leaflet";
import React, { memo, useEffect, useState } from "react";
import { Route } from "./api/route";
import { routingService } from "./api/routing-service";
import { RoutingQuery } from "./api/routing-query";
import { customIcon, LianeMap, routeOverlay } from "./LianeMap";
import { Marker } from "react-leaflet";
import { PointsInterface } from "./PointsInterface";
import { Point } from "./Point";
import { addressService } from "./api/address-service";

export interface Points {
  readonly waypoints: Point[];
  readonly selectedPoint?: number;
}

export function defaultRouteOverlay(start: LatLngLiteral, end: LatLngLiteral, route?: Route) {

  if (route) {
    return <>
      <Marker position={start} icon={customIcon}/>
      <Marker position={end} icon={customIcon}/>
      {routeOverlay(route, 0)}
    </>;
  } else {
    return <></>;
  }
}

export function DefaultRouteComponent({start, end}: { start: Point, end: Point }) {
  const zoom = 11;

  const center = {
    lat: (start.coordinate.lat + end.coordinate.lat) / 2,
    lng: (start.coordinate.lng + end.coordinate.lng) / 2
  };

  const [points, setPoints] = useState<Points>({
    waypoints: [start, end]
  });

  const [lastClickCoordinate, setLastClickCoordinate] = useState(start.coordinate);

  const [route, setRoute] = useState<Route>();

  const internalStart = points.waypoints[0].coordinate;
  const internalEnd = points.waypoints[points.waypoints.length - 1].coordinate;

  useEffect(() => {
    routingService.DefaultRouteMethod(new RoutingQuery(internalStart, internalEnd))
      .then(r => setRoute(r));
  }, [internalStart, internalEnd]);

  useEffect(() => {
    if (points.selectedPoint) {
      addressService.GetDisplayName(lastClickCoordinate)
        .then(a => ({...points.waypoints[points.selectedPoint!], coordinate: a.coordinate, address: a.displayName}))
        .then(p => {
          const waypoints = points.waypoints.map((w, i) => {
            if (i === points.selectedPoint) {
              return p;
            }
            return w;
          });
          setPoints(({waypoints, selectedPoint: -1}));
        });
    }
  }, [lastClickCoordinate])

  let overlay = defaultRouteOverlay(points.waypoints[0].coordinate, points.waypoints[1].coordinate, route);
  return <>
    <LianeMap onClick={c => setLastClickCoordinate(c)} center={center} zoom={zoom}>
      {overlay}
    </LianeMap>
    <PointsInterface pts={points} onChange={pts => setPoints(pts)}/>
  </>;

}

export const DefaultRoute = memo(DefaultRouteComponent);