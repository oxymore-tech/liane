import React, { memo, useEffect, useState } from "react";
import { LatLngLiteral } from "leaflet";
import { Route } from "./api/route";
import { routingService } from "./api/routing-service";
import { RoutingQuery } from "./api/routing-query";
import { Marker } from "react-leaflet";
import { customIcon, LianeMap, routeOverlay } from "./LianeMap";

function alternativesOverlay(start: LatLngLiteral, end: LatLngLiteral, routes?: Route[]) {
  if (routes) {
    return <>
      <Marker position={start} icon={customIcon}/>
      <Marker position={end} icon={customIcon}/>
      {routes.map((r, i) => routeOverlay(r, i))}
    </>
  } else {
    return null;
  }
}

function AlternativesComponent({start, end}: { start: LatLngLiteral, end: LatLngLiteral }) {
  const zoom = 11;
  const center = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  };

  const [alternatives, setAlternatives] = useState<Route[]>()

  useEffect(() => {
    routingService.GetAlternatives(new RoutingQuery(start, end))
      .then(r => setAlternatives(r));
  }, [start, end]);

  let overlay = alternativesOverlay(start, end, alternatives);

  return <LianeMap center={center} zoom={zoom}>
    {overlay}
  </LianeMap>;
}

export const Alternatives = memo(AlternativesComponent);