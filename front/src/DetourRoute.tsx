import React, {memo, useEffect, useState} from "react";
import {LatLngLiteral} from "leaflet";
import {Route} from "./api/route";
import {routingService} from "./api/routing-service";
import {RoutingQuery} from "./api/routing-query";
import {defaultRouteOverlay} from "./DefaultRoute";
import {customIcon, formatDistance, formatDuration, LianeMap} from "./LianeMap";
import {Marker, Polyline, Popup} from "react-leaflet";
import {Point} from "./Point";
import {PointsOverlay} from "./PointsOverlay";
import {addressService} from "./api/address-service";

function detourRouteOverlay(start: LatLngLiteral, end: LatLngLiteral, point: LatLngLiteral, detour: Route | undefined, overlay: any) {
    if (detour) {

        return <>
            {overlay}
            <Marker position={point} icon={customIcon}>
                <Popup>
                    <div>Point à éviter</div>
                </Popup>
            </Marker>
            {detourFound(detour)}
        </>;
    } else {
        return null;
    }
}

function detourFound(detour: Route) {

    const index = Math.round(detour.coordinates.length / 2);

    if (index < 0) {
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

function DetourRouteComponent({start, end, point}: { start: Point, end: Point, point: Point }) {
    const zoom = 10;

    const center = {
        lat: (start.coordinate.lat + end.coordinate.lat) / 2,
        lng: (start.coordinate.lng + end.coordinate.lng) / 2
    };

    const [waypoints, setWaypoints] = useState([start, point, end]);
    const [selectedPoint, setSelectedPoint] = useState(-1);
    const [lastClickCoordinate, setLastClickCoordinate] = useState(start.coordinate);
    const [lastAddressName, setLastAddressName] = useState(start.address);

    function setWaypoint(i: number, p: Point) {
        setWaypoints(waypoints.map((w, wi) => {
            if (wi === i) {
                return p;
            }
            return w;
        }))
    }

    const internalStart = waypoints[0].coordinate;
    const internalEnd = waypoints[waypoints.length - 1].coordinate;

    const [route, setRoute] = useState<Route>();
    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(internalStart, internalEnd))
            .then(r => setRoute(r));
    }, [internalStart, internalEnd])


    const [detour, setDetour] = useState<Route>();

    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(internalStart, internalEnd, waypoints[1].coordinate, route?.duration), "detour")
            .then(r => setDetour(r));
    }, [waypoints]);

    const overlay = detourRouteOverlay(internalStart, internalEnd, waypoints[1].coordinate, detour, defaultRouteOverlay(internalStart, internalEnd, route));


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

    return <>
        <LianeMap onClick={c => setLastClickCoordinate(c)} center={center} zoom={zoom}>
            {overlay}
        </LianeMap>
        <PointsOverlay waypoints={waypoints} onChange={setWaypoint} onSelect={setSelectedPoint}
                       onInput={setLastAddressName}/>
    </>;
}

export const DetourRoute = memo(DetourRouteComponent);