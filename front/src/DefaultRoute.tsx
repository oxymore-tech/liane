import {icon, LatLngLiteral} from "leaflet";
import React, {memo, useEffect, useState} from "react";
import {Route} from "./api/route";
import {routingService} from "./api/routing-service";
import {RoutingQuery} from "./api/routing-query";
import {customIcon, LianeMap, routeOverlay} from "./LianeMap";
import {Marker} from "react-leaflet";
import {PointsInterface} from "./PointsInterface";
import {Point} from "./Point";


export interface  Points {
    readonly waypoints:Point[];
    readonly indexSelected:number;// 0:start, 1:end, -1:none
}

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

// au lieu de start et end faire tableau pour distinguer point en fonction d'index
    const [points,setPoints] = useState({
        waypoints:[{coordinate:start,address:"Mende",exclude:false},{coordinate:end,address:"Florac",exclude:false}],
        indexSelected:-1
    });
    
    const [lastCoord,setLastCoord] = useState(start);
    
    const [route, setRoute] = useState<Route>();

    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery( points.waypoints[0].coordinate, points.waypoints[1].coordinate))
            .then(r => setRoute(r));
    }, [points.waypoints[0].coordinate, points.waypoints[1].coordinate]);

    useEffect( () => {
        if(points.indexSelected!=-1){
            const newPoint = {... points.waypoints[points.indexSelected], coordinate: lastCoord};
            let newWaypoints = points.waypoints;
            newWaypoints[points.indexSelected] = newPoint;
            setPoints( {waypoints: newWaypoints, indexSelected: -1});
        }
    }, [lastCoord])
    
    
    let overlay = defaultRouteOverlay(points.waypoints[0].coordinate, points.waypoints[1].coordinate, route);
    return <>
        <LianeMap onClick={ c => setLastCoord(c) } center={center} zoom={zoom} >
            {overlay}
        </LianeMap>
        <PointsInterface pts={points} onChange={ pts => setPoints(pts)} />
    </>;


}

export const DefaultRoute = memo(DefaultRouteComponent);