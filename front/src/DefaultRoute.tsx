import {LatLngLiteral} from "leaflet";
import React, {memo, useEffect, useState} from "react";
import {Route} from "./api/route";
import {routingService} from "./api/routing-service";
import {RoutingQuery} from "./api/routing-query";
import {endIcon, LianeMap, routeOverlay, startIcon} from "./LianeMap";
import {Marker} from "react-leaflet";
import {PointsOverlay} from "./PointsOverlay";
import {Point} from "./Point";
import {addressService} from "./api/address-service";

export interface Points {
    readonly waypoints: Point[];
    readonly selectedPoint: number;
}

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

export function DefaultRouteComponent({waypoints, setWaypoints}: { waypoints: Point[], setWaypoints:(w:Point[])=>void }) {
    const startPoint = waypoints[0];
    const endPoint = waypoints[waypoints.length - 1];
    
    const [selectedPoint, setSelectedPoint] = useState(-1);
    const [lastClickCoordinate, setLastClickCoordinate] = useState(startPoint.coordinate);
    const [lastAddressName, setLastAddressName] = useState(startPoint.address);


    const [route, setRoute] = useState<Route>();


    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(startPoint.coordinate, endPoint.coordinate))
            .then(r => setRoute(r));
    }, [startPoint, endPoint]);

    useEffect(() => {
        if (selectedPoint > -1) {
            addressService.GetDisplayName(lastClickCoordinate)
                .then(a => ({
                    ...waypoints[selectedPoint],
                    coordinate: a.coordinate,
                    address: a.displayName
                }))
                .then(newp => {
                    const modifiedWaypoints = waypoints.map((p, i) => {
                        if (i === selectedPoint) {
                            return newp;
                        }
                        return p;
                    });
                    setWaypoints(modifiedWaypoints);
                });
        }
    }, [lastClickCoordinate]);
    useEffect(() => {
        if (selectedPoint > -1) {
            addressService.GetCoordinate(lastAddressName)
                .then(a => ({
                    ...waypoints[selectedPoint],
                    coordinate: a.coordinate,
                    address: a.displayName
                }))
                .then(newp => {
                    const modifiedWaypoints = waypoints.map((p, i) => {
                        if (i === selectedPoint) {
                            return newp;
                        }
                        return p;
                    });
                    setWaypoints(modifiedWaypoints);
                });
        }
    }, [lastAddressName]);


    function setWaypoint(i: number, p: Point) {
        setWaypoints(waypoints.map((w, wi) => {
            if (wi === i) {
                return p;
            }
            return w;
        }))
    }

    let routeOverlay = defaultRouteOverlay(startPoint.coordinate, endPoint.coordinate, route);

    return <>
        <LianeMap onClick={c => setLastClickCoordinate(c)} start={startPoint.coordinate} end={endPoint.coordinate}>
            <>
                {routeOverlay}
            </>
        </LianeMap>
        <PointsOverlay waypoints={waypoints} onChange={setWaypoint} onSelect={setSelectedPoint}
                       onInput={setLastAddressName}/>
    </>;

}

export const DefaultRoute = memo(DefaultRouteComponent);