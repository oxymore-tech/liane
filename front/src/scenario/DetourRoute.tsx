import React, {memo, useEffect, useState} from "react";
import {Polyline} from "react-leaflet";
import {defaultRouteOverlay} from "@/scenario/DefaultRoute";
import {RoutingQuery} from "@/api/routing-query";
import {routingService} from "@/api/routing-service";
import {Route} from "@/api/route";
import {Point} from "@/map/Point";

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
        /*
            <Marker position={point} icon={customIcon}/>
            <Marker position={center} icon={customIcon}>
                <Popup>
                    <div>Distance: {formatDistance(detour.distance)}</div>
                    <div>Durée: {formatDuration(detour.duration)}</div>
                    <div>Delta: {detour.delta ? formatDuration(detour.delta) : null}</div>
                </Popup>
            </Marker>                
        */
        return <>
            <Polyline positions={detour.coordinates}/>
        </>
    } else {
        return null;
    }

}

export const DetourRoute = memo(DetourRouteComponent);