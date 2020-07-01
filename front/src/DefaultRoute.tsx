import {icon, LatLngLiteral} from "leaflet";
import React, {memo, useEffect, useState} from "react";
import {Route} from "./api/route";
import {routingService} from "./api/routing-service";
import {RoutingQuery} from "./api/routing-query";
import {customIcon, LianeMap, routeOverlay} from "./LianeMap";
import {Marker} from "react-leaflet";



export function defaultRouteOverlay(start: LatLngLiteral, end: LatLngLiteral, route?: Route) {
    if (route) {
        return <>
            <Marker position={start} icon={customIcon}/>
            <Marker position={end} icon={customIcon}/>
            {routeOverlay(route,0)}
        </>;
    } else {
        return <></>;
    }
}


export function DefaultRouteComponent({start, end}: { start: LatLngLiteral, end: LatLngLiteral }) {
    const zoom = 11;

    const center = {
        lat: (start.lat + end.lat) / 2,
        lng: (start.lng + end.lng) / 2
    };

    const [route, setRoute] = useState<Route>();

    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(start, end))
            .then(r => setRoute(r));
    }, [start, end]);

    let overlay = defaultRouteOverlay(start, end, route);
    return <LianeMap center={center} zoom={zoom}>
        {overlay}
    </LianeMap>;


}

export const DefaultRoute = memo(DefaultRouteComponent);