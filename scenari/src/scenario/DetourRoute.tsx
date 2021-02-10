import React, {memo, useEffect, useState} from "react";
import {Marker, Polyline, Popup} from "react-leaflet";
import {defaultRouteOverlay} from "scenario/DefaultRoute";
import {RoutingQuery} from "api/routing-query";
import {routingService} from "api/routing-service";
import {Route} from "api/route";
import {Point} from "map/Point";
import {customIcon, formatDistance, formatDuration} from "../map/LianeMap";

function DetourRouteComponent({waypoints}: { waypoints: Point[] }) {

    const internalStart = waypoints[0].address.coordinate;
    const internalEnd = waypoints[waypoints.length - 1].address.coordinate;

    const [route, setRoute] = useState<Route>();
    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(internalStart, internalEnd))
            .then(r => setRoute(r));
    }, [internalStart, internalEnd])

    const [detour, setDetour] = useState<Route>();
    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(internalStart, internalEnd, waypoints[1].address.coordinate, route?.duration), "detour")
            .then(r => setDetour(r));
    }, [waypoints]);


    if (!detour) {
        return defaultRouteOverlay(internalStart, internalEnd, route);
    }

    const index = Math.round(detour.coordinates.length / 2);
    if (index > 0) {
        const center = detour.coordinates[index];
        
        
        return <>
            <Marker position={waypoints[1].address.coordinate} icon={customIcon}/>
            {/*
            <Marker position={center} icon={customIcon}>
                <Popup>
                    <div>Distance: {formatDistance(detour.distance)}</div>
                    <div>Durée: {formatDuration(detour.duration)}</div>
                    <div>Delta: {detour.delta ? formatDuration(detour.delta) : null}</div>
                </Popup>
            </Marker>

            */}
            <Polyline positions={detour.coordinates}/>
        </>
    } else {
        // Show shortest route between start and end
        return <>
            {route?
                <>
                    {defaultRouteOverlay(internalStart,internalEnd,route)}
                    <Marker position={waypoints[1].address.coordinate} icon={customIcon}/>
                </>:
                null
            }
        </>;
    }

}

export const DetourRoute = DetourRouteComponent;