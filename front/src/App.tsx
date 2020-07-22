import React, {useState} from "react";
import 'leaflet/dist/leaflet.css';
import 'react-select/dist/react-select.css';
import './App.css';
import {Alternatives} from "./Alternatives";
import {WaypointRoute} from "./WaypointRoute";
import {DetourRoute} from "./DetourRoute";
import {DefaultRoute} from "./DefaultRoute";
import {Point} from "./Point";


enum scenarios {
    defaultRoute,
    alternatives,
    detourRoute,
    waypointRoute
}


function App() {

    const start = {coordinate: {lat: 44.5180226, lng: 3.4991057}, address: "Mende", exclude: false};
    const end = {coordinate: {lat: 44.31901305, lng: 3.57802065202088}, address: "Florac", exclude: false};
    const waypoint = {
        coordinate: {lat: 44.38624954223633, lng: 3.6189568042755127},
        address: "Point de passage",
        exclude: false
    };


    const [waypoints, setWaypoints] = useState([start,waypoint, end]);
    
    const [scenario, setScenario] = useState<number>(scenarios.defaultRoute);

    function selectedScenarioOverlay(s: scenarios) {
        switch (s) {
            case scenarios.defaultRoute:
                return <DefaultRoute waypoints={waypoints} setWaypoints={setWaypoints}/>;
            case scenarios.alternatives:
                return <Alternatives waypoints={waypoints} setWaypoints={setWaypoints}/>;
            case scenarios.detourRoute:
                return <DetourRoute waypoints={waypoints} setWaypoints={setWaypoints}/>;
            case scenarios.waypointRoute:
                return <WaypointRoute waypoints={waypoints} setWaypoints={setWaypoints}/>;
        }
    }

    function onChange() {

    }

    const overlay = selectedScenarioOverlay(scenario);

    return (
        <div className="App">
            <select className={"scenario-select"}
                    value={scenario}
                    onChange={e => setScenario(parseInt(e.target.value))}>
                <option value={scenarios.defaultRoute}>defaultRoute</option>
                <option value={scenarios.alternatives}>alternatives</option>
                <option value={scenarios.detourRoute}>detourRoute</option>
                <option value={scenarios.waypointRoute}>waypointRoute</option>
            </select>
            {overlay}
        </div>
    );
}


export default App;
