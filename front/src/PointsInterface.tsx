import React, {useEffect, useState} from "react";
import {Point, PointComponent} from "./Point";
import {Points} from "./DefaultRoute";

export function PointsInterface({pts, onChange}: { pts: Points, onChange: (pts: Points) => void }) {
    const [points, setPoints] = useState(pts);
    useEffect(() => {
        console.log("onChangePointsInterface");
        onChange(points);
    }, [points]);

    function onPointChange(index: number, newp?: Point) {
        console.log("onPointChange")
        if (newp) {
            console.log("with newPoint")
            const waypoints = points.waypoints.map((p, i) => {
                if (i === index) {
                    return newp;
                }
                return p;
            });
            setPoints({...points, waypoints: waypoints, selectedPoint: -1})

        } else {
            console.log("with index alone")
            setPoints({...points, selectedPoint: index})
        }
    }
    let pointsOverlay = points.waypoints.map((p, i) => {
        if (i === 0 || i === points.waypoints.length - 1) {
            return <PointComponent key={i} point={p} index={i} onChange={onPointChange}/>;
        } else {
            return <PointComponent key={i} point={p} index={i} onChange={onPointChange} optional={true}/>;
        }
    });
    return <div className={"pointsInterface .leaflet-bar"}>
        {pointsOverlay}
    </div>;
}