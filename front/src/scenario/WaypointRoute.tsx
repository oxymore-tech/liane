import React, {memo, useEffect, useState} from "react";
import {customIcon, formatDistance, formatDuration} from "map/LianeMap";
import {defaultRouteOverlay} from "scenario/DefaultRoute";
import {routingService} from "api/routing-service";
import {RoutingQuery} from "api/routing-query";
import {Route} from "api/route";
import {Marker, Polyline, Popup} from "react-leaflet";
import {Point} from "map/Point";


function WaypointRouteComponent({waypoints}: { waypoints: Point[] }) {
  const internalStart = waypoints[0].address.coordinate;
  const internalEnd = waypoints[waypoints.length - 1].address.coordinate;
  const internalWaypoint = waypoints[1].address.coordinate;

  const [route, setRoute] = useState<Route>();
  useEffect(() => {
    routingService.DefaultRouteMethod(new RoutingQuery(internalStart, internalEnd))
      .then(r => setRoute(r));
  }, [internalStart, internalEnd])

  const [waypointRoute, setWaypointRoute] = useState<Route>();
  useEffect(() => {
    routingService.DefaultRouteMethod(new RoutingQuery(internalStart, internalEnd, internalWaypoint), "waypoint")
      .then(r => setWaypointRoute(r));
  }, [internalStart,internalWaypoint, internalEnd])

  const overlay = defaultRouteOverlay(internalStart, internalEnd, route);

  if (waypointRoute) {
    return <>
      {overlay}
      <Marker position={internalWaypoint} icon={customIcon}>
        <Popup>
          <div>Distance: {formatDistance(waypointRoute.distance ?? 0)}</div>
          <div>Durée: {formatDuration(waypointRoute.duration)}</div>
          <div>Delta: {waypointRoute.delta ? formatDuration(waypointRoute.delta) : null}</div>
        </Popup>
      </Marker>
      <Polyline positions={waypointRoute.coordinates}/>
    </>;
  } else {
    return null;
  }

}

export const WaypointRoute = WaypointRouteComponent;