import React, {useEffect, useState} from "react";
import {LatLngLiteral} from "leaflet";
import {Point, PointComponent} from "./Point";
import {Points} from "./DefaultRoute";

export function PointsInterface({pts,onChange}:{pts:Points,onChange:(pts:Points)=>void}) {
    const [points,setPoints] = useState(pts);
    useEffect(()=>onChange(points),[points]);
    
    function onPointChange(i:number,p?:Point){
        let newWaypoints = points.waypoints;
        if(p){newWaypoints[i] = p}
        setPoints({waypoints:newWaypoints,indexSelected:i} )
    }
    
    
    return <div className={"pointsInterface .leaflet-bar"}>
        <PointComponent  point={points.waypoints[0]} index={0} onChange={onPointChange} />
        {/* TODO: Insert here loop on waypoints from index 2 to last index
        {
            points.waypoints.map(w => <PointComponent point={w} optional={true} />)
        }
        */}
        <PointComponent  point={points.waypoints[1]} index={1} onChange={onPointChange}/>
    </div>;
}