import React, {useState} from "react";
import 'leaflet/dist/leaflet.css';
import 'antd/dist/antd.css';
import 'App.css';
import {Select} from 'antd';
import {Scenario} from "api/scenario";
import {RouteMap} from "map/RouteMap";

const {Option} = Select;

function App() {

    const [scenario, setScenario] = useState<number>(Scenario.defaultRoute);

    return (
        <div className="App">
            <Select className={"scenario-select"}
                    value={scenario}
                    onChange={setScenario}>
                <Option value={Scenario.defaultRoute}>defaultRoute</Option>
                <Option value={Scenario.alternatives}>alternatives</Option>
                <Option value={Scenario.detourRoute}>detourRoute</Option>
                <Option value={Scenario.waypointRoute}>waypointRoute</Option>
            </Select>

            <RouteMap scenario={scenario}/>
        </div>
    );
}


export default App;
