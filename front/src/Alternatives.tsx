import React, {memo, useEffect, useState} from "react";
import {LatLngLiteral} from "leaflet";
import {Route} from "./api/route";
import {routingService} from "./api/routing-service";
import {RoutingQuery} from "./api/routing-query";
import {Marker} from "react-leaflet";
import {endIcon, LianeMap, routeOverlay, startIcon} from "./LianeMap";
import {PointsOverlay} from "./PointsOverlay";
import {addressService} from "./api/address-service";
import {Point} from "./Point";

function alternativesOverlay(start: LatLngLiteral, end: LatLngLiteral, routes?: Route[]) {
    if (routes) {
        return <>
            <Marker position={start} icon={startIcon}/>
            <Marker position={end} icon={endIcon}/>
            {routes.map((r, i) => routeOverlay(r, i))}
        </>
    } else {
        return null;
    }
}

function AlternativesComponent({waypoints, setWaypoints}: { waypoints: Point[], setWaypoints: (w: Point[]) => void }) {
    const zoom = 10;

    const startPoint = waypoints[0];
    const endPoint = waypoints[waypoints.length - 1];


    const center = {
        lat: (startPoint.coordinate.lat + endPoint.coordinate.lat) / 2,
        lng: (startPoint.coordinate.lng + endPoint.coordinate.lng) / 2
    };

    const [alternatives, setAlternatives] = useState<Route[]>()

    const [selectedPoint, setSelectedPoint] = useState(-1);
    const [lastClickCoordinate, setLastClickCoordinate] = useState(startPoint.coordinate);
    const [lastAddressName, setLastAddressName] = useState(startPoint.address);


    useEffect(() => {
        routingService.GetAlternatives(new RoutingQuery(startPoint.coordinate, endPoint.coordinate))
            .then(r => setAlternatives(r));
    }, [startPoint, endPoint]);


    let overlay = alternativesOverlay(waypoints[0].coordinate, waypoints[1].coordinate, alternatives);


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


    return <>
        <LianeMap onClick={c => setLastClickCoordinate(c)} start={startPoint.coordinate} end={endPoint.coordinate}>
            {overlay}
        </LianeMap>
        <PointsOverlay waypoints={waypoints} onChange={setWaypoint} onSelect={setSelectedPoint}
                       onInput={setLastAddressName}/>
    </>;
}

export const Alternatives = memo(AlternativesComponent);