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
import {Address} from "./api/address";
import VirtualizedSelect from "react-virtualized-select";

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

export function DefaultRouteComponent({start, end}: { start: Point, end: Point }) {
    const zoom = 10;

    const center = {
        lat: (start.coordinate.lat + end.coordinate.lat) / 2,
        lng: (start.coordinate.lng + end.coordinate.lng) / 2
    };

    const [waypoints, setWaypoints] = useState([start, end]);

    const [selectedPoint, setSelectedPoint] = useState(-1);

    const [lastClickCoordinate, setLastClickCoordinate] = useState(start.coordinate);

    const [lastAddressName, setLastAddressName] = useState(start.address);

    const [selectedAddress, setSelectedAddress] = useState<Address>({
        displayName: "default",
        coordinate: start.coordinate
    });
    const [addresses, setAddresses] = useState<Address[]>([]);

    const [route, setRoute] = useState<Route>();

    const internalStart = waypoints[0].coordinate;
    const internalEnd = waypoints[waypoints.length - 1].coordinate;

    useEffect(() => {
        routingService.DefaultRouteMethod(new RoutingQuery(internalStart, internalEnd))
            .then(r => setRoute(r));
    }, [internalStart, internalEnd]);

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

    // Option<TValue> | Options<TValue> | null
    // OnChangeHandler<OptionValues, Option<OptionValues> | Options<OptionValues>>
    const onChange = (sa: Address | null) => {
        if (sa != null) {
            setSelectedAddress(selectedAddress);
        } else {
            setSelectedAddress({
                coordinate: start.coordinate,
                displayName: start.address
            })
        }
    }
    
    function loadAddresses(displayName: string) {
        return addressService.Search(displayName)
            .then((a) => {
                setAddresses(a);
                return {options:new Array(a)};
            })
    }
    

    function onSelectClick() {
// equals to previous selectClick in point
    }

    let routeOverlay = defaultRouteOverlay(waypoints[0].coordinate, waypoints[1].coordinate, route);

    return <>
        <LianeMap onClick={c => setLastClickCoordinate(c)} center={center} zoom={zoom}>
            {routeOverlay}
        </LianeMap>

        <PointsOverlay waypoints={waypoints} onChange={setWaypoint} onSelect={setSelectedPoint}
                       onInput={setLastAddressName}>
            <div>
                <VirtualizedSelect
                    async
                    backspaceRemoves={false}
                    labelKey='displayName' 
                    
                    loadOptions={loadAddresses}
                    options={new Array(addresses)}
                    
                    /*onChange={selectedOption => {
                        if (selectedOption?.hasOwnProperty("coordinate") && selectedOption?.hasOwnProperty("displayName")) {
                            onChange({coordinate: selectedOption?.coordinate, displayName: selectedOption?.displayName});
                        }
                    }
                    }*/
                    
                    onValueClick={onSelectClick}
                    value={selectedAddress}
                    valueKey='displayName'
                />
            </div>
        </PointsOverlay>
    </>;

}

export const DefaultRoute = memo(DefaultRouteComponent);