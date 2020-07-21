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

function AlternativesComponent({start, end}: { start: Point, end: Point }) {
    const zoom = 10;

    const center = {
        lat: (start.coordinate.lat + end.coordinate.lat) / 2,
        lng: (start.coordinate.lng + end.coordinate.lng) / 2
    };

    const [alternatives, setAlternatives] = useState<Route[]>()

    const [waypoints, setWaypoints] = useState([start, end]);
    const [selectedPoint, setSelectedPoint] = useState(-1);
    const [lastClickCoordinate, setLastClickCoordinate] = useState(start.coordinate);
    const [lastAddressName, setLastAddressName] = useState(start.address);

    const internalStart = waypoints[0].coordinate;
    const internalEnd = waypoints[waypoints.length - 1].coordinate;

    useEffect(() => {
        routingService.GetAlternatives(new RoutingQuery(internalStart, internalEnd))
            .then(r => setAlternatives(r));
    }, [internalStart, internalEnd]);


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
        <LianeMap  onClick={c => setLastClickCoordinate(c)} center={center} zoom={zoom}>
            {overlay}
        </LianeMap>
        <PointsOverlay waypoints={waypoints} onChange={setWaypoint} onSelect={setSelectedPoint}
                       onInput={setLastAddressName}/>
    </>;
}

export const Alternatives = memo(AlternativesComponent);