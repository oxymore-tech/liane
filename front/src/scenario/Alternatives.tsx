import React, {memo, useEffect, useState} from "react";
import {Route} from "@/api/route";
import {routingService} from "@/api/routing-service";
import {RoutingQuery} from "@/api/routing-query";
import {Marker} from "react-leaflet";
import {endIcon, routeOverlay, startIcon} from "@/map/LianeMap";
import {Point} from "@/map/Point";


function AlternativesComponent({waypoints}: { waypoints: Point[] }) {

    const startPoint = waypoints[0];
    const endPoint = waypoints[waypoints.length - 1];

    const [alternatives, setAlternatives] = useState<Route[]>()

    
    useEffect(() => {
        routingService.GetAlternatives(new RoutingQuery( startPoint.address.coordinate, endPoint.address.coordinate))
            .then(r => setAlternatives(r));
    }, [startPoint, endPoint]);

    
    if (alternatives) {
        return <>
            <Marker position={startPoint.address.coordinate} icon={startIcon}/>
            <Marker position={endPoint.address.coordinate} icon={endIcon}/>
            {alternatives.map((r, i) => routeOverlay(r, i))}
        </>
    } else {
        return null;
    }
}

export const Alternatives = memo(AlternativesComponent);