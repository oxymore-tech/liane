import {LatLngLiteral} from "leaflet";
import React, {memo, useEffect, useState} from "react";
import {Route} from "./api/route";
import {routingService} from "./api/routing-service";
import {RoutingQuery} from "./api/routing-query";
import {customIcon, formatDistance, formatDuration, LianeMap} from "./LianeMap";
import {defaultRouteOverlay} from "./DefaultRoute";
import {Marker, Polyline, Popup} from "react-leaflet";
import {Point} from "./Point";
import {PointsOverlay} from "./PointsOverlay";
import {addressService} from "./api/address-service";

function waypointRouteOverlay(start: LatLngLiteral, end: LatLngLiteral, point: LatLngLiteral, waypoint?: Route, overlay?: JSX.Element) {
    if (waypoint) {
        return <>
            {overlay}
            <Marker position={point} icon={customIcon}>
                <Popup>
                    <div>Distance: {formatDistance(waypoint.distance)}</div>
                    <div>Durée: {formatDuration(waypoint.duration)}</div>
                    <div>Delta: {waypoint.delta ? formatDuration(waypoint.delta) : null}</div>
                </Popup>
            </Marker>
            <Polyline positions={waypoint.coordinates}/>
        </>;
    } else {
        return null;
    }
}

function WaypointRouteComponent({start, end, point}: { start: Point, end: Point, point: Point }) {
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


    const [waypointRoute, setWaypointRoute] = useState<Route>();
    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(internalStart, internalEnd, waypoints[1].coordinate, route?.duration), "waypoint")
            .then(r => setWaypointRoute(r));
    }, [waypoints]);

    const overlay = waypointRouteOverlay(internalStart, internalEnd, waypoints[1].coordinate, waypointRoute, defaultRouteOverlay(internalStart, internalEnd, route));


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

export const WaypointRoute = memo(WaypointRouteComponent);