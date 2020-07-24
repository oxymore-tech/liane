import {LatLngLiteral} from "leaflet";
import React, {memo, useEffect, useState} from "react";
import {endIcon, routeOverlay, startIcon} from "@/map/LianeMap";
import {Route} from "@/api/route";
import {Point} from "@/map/Point";
import {Marker} from "react-leaflet";
import {routingService} from "@/api/routing-service";
import {RoutingQuery} from "@/api/routing-query";


export function defaultRouteOverlay(start: LatLngLiteral, end: LatLngLiteral, route?: Route) {

    if (route) {
        return <>
            <Marker position={start} icon={startIcon}/>
            <Marker position={end} icon={endIcon}/>
            {routeOverlay(route, 0)}
        </>;
    } else {
        return <></>;
    }
}

export function DefaultRouteComponent({waypoints}: { waypoints: Point[] }) {
    const startPoint = waypoints[0];
    const endPoint = waypoints[waypoints.length - 1];

    const [route, setRoute] = useState<Route>();

    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(startPoint.address.coordinate, endPoint.address.coordinate))
            .then(r => setRoute(r));
    }, [startPoint, endPoint]);

    if (route) {
        return <>
            <Marker position={startPoint.address.coordinate} icon={startIcon}/>
            <Marker position={endPoint.address.coordinate} icon={endIcon}/>
            {routeOverlay(route, 0)}
        </>;
    } else {
        return <></>;
    }

}

export const DefaultRoute = memo(DefaultRouteComponent);