import React, {memo, useEffect, useState} from "react";
import {LianeMap} from "@/map/LianeMap";
import {PointsOverlay} from "@/map/PointsOverlay";
import {Point} from "@/map/Point";
import {addressService} from "@/api/address-service";
import {Scenario} from "@/api/scenario";
import {RoutingScenario} from "@/scenario/RoutingScenario";

export function RouteMapComponent({scenario}: { scenario: Scenario }) {
    const defaultStart = {
        address: {
            coordinate: {lat: 44.5180226, lng: 3.4991057},
            displayName: "Mende"
        },
        exclude: false
    };
    const defaultWaypoint = {
        address: {
            coordinate: {lat: 44.38624954223633, lng: 3.6189568042755127},
            displayName: "Point de passage"
        },
        exclude: false
    };
    const defaultEnd = {
        address: {
            coordinate: {lat: 44.31901305, lng: 3.57802065202088},
            displayName: "Florac"
        },
        exclude: false
    };

    const [waypoints, setWaypoints] = useState([defaultStart, defaultWaypoint, defaultEnd]);

    const [selectedPoint, setSelectedPoint] = useState(-1);
    const [lastClickCoordinate, setLastClickCoordinate] = useState(waypoints[0].address.coordinate);
    const [lastAddressName, setLastAddressName] = useState(waypoints[waypoints.length - 1].address.displayName);

    useEffect(() => {
        if (selectedPoint > -1) {
            addressService.GetDisplayName(lastClickCoordinate)
                .then(a => ({
                    ...waypoints[selectedPoint],
                    coordinate: a.coordinate,
                    address: a
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
                    address: a
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
        setWaypoints(
            waypoints.map((w, wi) => {
                if (wi === i) {
                    return p;
                }
                return w;
            })
        )
    }

    return <>
        <LianeMap onClick={c => setLastClickCoordinate(c)} waypoints={waypoints}>
            <RoutingScenario selected={scenario} waypoints={waypoints}/>
        </LianeMap>
        <PointsOverlay waypoints={waypoints} onChange={setWaypoint} onSelect={setSelectedPoint}
                       onInput={setLastAddressName}/>
    </>;

}

export const RouteMap = memo(RouteMapComponent);