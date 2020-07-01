import { Route } from "./api/route";
import { Map, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import React from "react";
import * as math from "mathjs";
import moment from "moment";
import { icon, LatLngLiteral } from "leaflet";
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconShadow from 'leaflet/dist/images/marker-shadow.png';

export function formatDistance(distance: number) {
  const unit = math.unit(distance, 'm');
  return unit.format({notation: 'fixed', precision: 2});
}

export function formatDuration(duration: number) {
  return moment.duration(duration, 'seconds').humanize();
}

export const customIcon = icon({
  iconUrl: markerIcon,
  shadowUrl: markerIconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export function routeOverlay(r: Route, i: number) {
  const l = Math.round(r.coordinates.length / 2);
  const center = r.coordinates[l];
  return <div key={i}>
    <Marker position={center} icon={customIcon}>
      <Popup>
        <div>Distance: {formatDistance(r.distance)}</div>
        <div>Durée: {formatDuration(r.duration)}</div>
      </Popup>
    </Marker>
    <Polyline positions={r.coordinates}/>
  </div>;
}

export function LianeMap({children, center, zoom}: { children: JSX.Element | null, center: LatLngLiteral, zoom: number }) {
  return <Map className="map" center={center} zoom={zoom}>
    <TileLayer
      key="tiles"
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
    />
    {children}
  </Map>;
}
