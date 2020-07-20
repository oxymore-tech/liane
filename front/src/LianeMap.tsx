import {Route} from "./api/route";
import {Map, Marker, Polyline, Popup, TileLayer} from "react-leaflet";
import React from "react";
import * as math from "mathjs";
import moment from "moment";
import {icon, LatLngLiteral, LeafletMouseEvent} from "leaflet";
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import infoIconImg from "./data/icon/info-icon.png"
import startIconImg from "./data/icon/start-icon.png"
import endIconImg from "./data/icon/end-icon.png"
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

export const infoIcon = icon({
    iconUrl: infoIconImg,
    shadowUrl: markerIconShadow,
    iconSize: [24, 40],
    iconAnchor: [12, 40]
});

export const startIcon = icon({
    iconUrl: startIconImg,
    shadowUrl: markerIconShadow,
    iconSize: [24, 40],
    iconAnchor: [12, 40]
});

export const endIcon = icon({
    iconUrl: endIconImg,
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


export function LianeMap({onClick, children, center, zoom}: { onClick?: (c: LatLngLiteral) => void, children: JSX.Element | null, center: LatLngLiteral, zoom: number }) {

    function handleClick(e: LeafletMouseEvent) {
        if (onClick) {
            onClick({lat: e.latlng.lat, lng: e.latlng.lng});
        }
    }

    return <Map onclick={handleClick} className="map" center={center} zoom={zoom}>
        <TileLayer
            key="tiles"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
        />
        {children}
    </Map>;
}
