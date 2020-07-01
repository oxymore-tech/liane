import React, {memo, useEffect, useState} from "react";
import {LatLngLiteral} from "leaflet";
import {Route} from "./api/route";
import {routingService} from "./api/routing-service";
import {RoutingQuery} from "./api/routing-query";
import {defaultRouteOverlay} from "./DefaultRoute";
import {customIcon, formatDistance, formatDuration, LianeMap} from "./LianeMap";
import {Marker, Polyline, Popup} from "react-leaflet";

function detourRouteOverlay(start: LatLngLiteral, end: LatLngLiteral, point: LatLngLiteral, detour: Route | undefined, overlay: any) {
    if (detour) {
        
        return <>
            {/*overlay*/}
            <Marker position={point} icon={customIcon}>
                <Popup>
                    <div> Point a eviter </div>
                </Popup>
            </Marker>
            {detourFound(detour)}
        </>;
    } else {
        return null;
    }
}
function detourFound(detour: Route){
    
    const index = Math.round(detour.coordinates.length / 2);

    console.log(detour);
    if(index <0){
        const center = detour.coordinates[index];
/*
<Marker position={center} icon={customIcon}>
                <Popup>
                    <div>Distance: {formatDistance(detour.distance)}</div>
                    <div>Durée: {formatDuration(detour.duration)}</div>
                    <div>Delta: {detour.delta? formatDuration(detour.delta): null }</div>
                </Popup>
            </Marker>/
 */
        return <>
            
            <Polyline positions={detour.coordinates}/>
        </>
    }else{
        return null;
    }
    
}
function DetourRouteComponent({start, end, point}: {start: LatLngLiteral, end: LatLngLiteral, point: LatLngLiteral}) {
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


    const [detour, setDetour] = useState<Route>();

    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(start, end, point), "detour")
            .then(r => setDetour(r));
    }, [start, end]);

    const overlay = detourRouteOverlay(start, end, point, detour, defaultRouteOverlay(start,end,route));

    return <LianeMap center={center} zoom={zoom}>
        {overlay}
    </LianeMap>;
}

export const DetourRoute = memo(DetourRouteComponent);