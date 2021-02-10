import { Route } from "api/route";
import { Map, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import React from "react";
import * as math from "mathjs";
import moment from "moment";
import { icon, latLngBounds, LatLngLiteral, LeafletMouseEvent } from "leaflet";
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Point } from "map/Point";

export function formatDistance(distance: number) {
  const unit = math.unit(distance, 'm');
  return unit.format({notation: 'fixed', precision: 2});
}

export function formatDuration(duration: number) {
  const time = moment.duration(duration, 'seconds');
  if (time.hours() < 1) {
    return `${time.minutes()} minute${time.minutes() < 2 ? "" : "s"}`;
  } else {
    return `${time.hours()} heure${time.hours() < 2 ? "" : "s"} et ${time.minutes()} minute${time.minutes() < 2 ? "" : "s"}`;
  }
  return;
}

export const customIcon = icon({
  iconUrl: markerIcon,
  shadowUrl: markerIconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export const infoIcon = icon({
  iconUrl: "icon/info-icon.png",
  shadowUrl: markerIconShadow,
  iconSize: [24, 40],
  iconAnchor: [12, 40]
});

export const startIcon = icon({
  iconUrl: "icon/start-icon.png",
  shadowUrl: markerIconShadow,
  iconSize: [24, 40],
  iconAnchor: [12, 40]
});

export const endIcon = icon({
  iconUrl: "icon/end-icon.png",
  shadowUrl: markerIconShadow,
  iconSize: [24, 40],
  iconAnchor: [12, 40]
});


export function routeOverlay(r: Route, i: number) {
  const l = Math.round(r.coordinates.length / 2);
  const center = r.coordinates[l];
  return <div key={i}>
    <Marker position={center} icon={infoIcon}>
      <Popup>
        <div>Distance: {formatDistance(r.distance)}</div>
        <div>Durée: {formatDuration(r.duration)}</div>
      </Popup>
    </Marker>
    <Polyline positions={r.coordinates}/>
  </div>;
}


export function LianeMap({
                           onClick,
                           children,
                           waypoints
                         }: { onClick?: (c: LatLngLiteral) => void, children: JSX.Element | null, waypoints: Point[] }) {
  const bounds = latLngBounds(waypoints.map(p => p.address.coordinate));

  const start = waypoints[0].address.coordinate;
  const end = waypoints[waypoints.length - 1].address.coordinate;

  const center = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2
  };

  function handleClick(e: LeafletMouseEvent) {
    if (onClick) {
      onClick({lat: e.latlng.lat, lng: e.latlng.lng});
    }
  }

  return <Map onclick={handleClick} className="map" center={center} bounds={bounds}>
    <TileLayer
      key="tiles"
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
    />
    {children}
  </Map>;
}
