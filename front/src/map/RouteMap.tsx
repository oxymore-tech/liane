import React, {memo, useEffect, useState} from "react";
import {LianeMap} from "map/LianeMap";
import {PointsOverlay} from "map/PointsOverlay";
import {Point} from "map/Point";
import {addressService} from "api/address-service";
import {Scenario} from "api/scenario";
import {RoutingScenario} from "scenario/RoutingScenario";

export function RouteMapComponent({scenario, onChange}: { scenario: Scenario, onChange: (s:Scenario) => void }) {
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
          address: a
        }))
        .then(newp => setWaypoint(selectedPoint,newp));
    }
  }, [lastClickCoordinate]);
  

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

  useEffect(() => {
    if(scenario === Scenario.waypointRoute || scenario === Scenario.detourRoute){
      if(waypoints[1].exclude){
        onChange(Scenario.detourRoute);
      }else{
        onChange(Scenario.waypointRoute);
      }
    }
  },[scenario,waypoints[1].exclude])
  return <>
    <LianeMap onClick={c => setLastClickCoordinate(c)} waypoints={waypoints}>
      <RoutingScenario selected={scenario} waypoints={waypoints}/>
    </LianeMap>
    <PointsOverlay waypoints={waypoints} scenario={scenario} onChange={setWaypoint} onSelect={setSelectedPoint}
                   onInput={setLastAddressName}/>
  </>;

}

export const RouteMap = RouteMapComponent;