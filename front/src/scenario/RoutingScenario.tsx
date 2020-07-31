import {Scenario} from "api/scenario";
import {Point} from "map/Point";
import React, {memo} from "react";
import {DetourRoute} from "scenario/DetourRoute";
import {WaypointRoute} from "scenario/WaypointRoute";
import {DefaultRoute} from "scenario/DefaultRoute";
import {Alternatives} from "scenario/Alternatives";

function RoutingScenarioComponent({selected, waypoints}: { selected: Scenario, waypoints: Point[] }) {
    switch (selected) {
        case Scenario.defaultRoute:
            return <DefaultRoute waypoints={waypoints}/>;
        case Scenario.alternatives:
            return <Alternatives waypoints={waypoints}/>;
        case Scenario.detourRoute:
            return <DetourRoute waypoints={waypoints}/>;
        case Scenario.waypointRoute:
            return <WaypointRoute waypoints={waypoints}/>;
    }

}

export const RoutingScenario = RoutingScenarioComponent;