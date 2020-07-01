import {LatLngLiteral} from "leaflet";
import React, {memo, useEffect, useState} from "react";
import {Route} from "./api/route";
import {routingService} from "./api/routing-service";
import {RoutingQuery} from "./api/routing-query";
import {customIcon, formatDistance, formatDuration, LianeMap} from "./LianeMap";
import {defaultRouteOverlay} from "./DefaultRoute";
import {Marker, Polyline, Popup} from "react-leaflet";

function waypointRouteOverlay(start: LatLngLiteral, end: LatLngLiteral, point: LatLngLiteral, waypoint?: Route, overlay?: JSX.Element) {
    if (waypoint) {
        return <>
            {overlay}
            <Marker position={point} icon={customIcon}>
                <Popup>
                    <div>Distance: {formatDistance(waypoint.distance)}</div>
                    <div>Durée: {formatDuration(waypoint.duration)}</div>
                    <div>Delta: {waypoint.delta? formatDuration(waypoint.delta): null }</div>
                </Popup>
            </Marker>
            <Polyline positions={waypoint.coordinates}/>
        </>;
    } else {
        return null;
    }
}

function WaypointRouteComponent({start, end, point}: { start: LatLngLiteral, end: LatLngLiteral, point: LatLngLiteral }) {
    const zoom = 11;
    const center = {
        lat: (start.lat + end.lat) / 2,
        lng: (start.lng + end.lng) / 2
    };

    const [route, setRoute] = useState<Route>();

    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(start, end))
            .then(r => setRoute(r));
    }, [start, end])
    
    
    const [waypoint, setWaypoint] = useState<Route>();

    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(start, end, point, route?.duration), "waypoint")
            .then(r => setWaypoint(r));
    }, [start, end]);

    const overlay = waypointRouteOverlay(start, end, point, waypoint, defaultRouteOverlay(start,end,route));

    return <LianeMap center={center} zoom={zoom}>
        {overlay}
    </LianeMap>;
}

export const WaypointRoute = memo(WaypointRouteComponent);