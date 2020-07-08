import React, {useState} from "react";
import {LatLngLiteral} from "leaflet";
import {Point, PointComponent} from "./Point";

interface  Points {
    readonly start:Point;
    readonly end:Point;
    readonly waypoints:Point[];
}

export function PointsInterface({start, end}:{start:LatLngLiteral,end:LatLngLiteral}) {
    const [points,setPoints] = useState({
        start:{coordinate:start,address:"Mende",exclude:false},
        end:{coordinate:end,address:"Florac",exclude:false},
        waypoints:[]
    });
    return <div className={"pointsInterface .leaflet-bar"}>
        <PointComponent  point={points.start} optional={false} />
        {/* TODO: Insert here loop on waypoints*/}
        {
            points.waypoints.map(w => <PointComponent point={w} optional={true} />)
        }
        <PointComponent  point={points.end} optional={false}/>
    </div>;
}