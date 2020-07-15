import React from "react";
import { Point, PointComponent } from "./Point";

export interface PointsOverlayProps {
  waypoints: Point[],
  onChange: (i: number, p: Point) => void
  onSelect: (i: number) => void
}

export function PointsOverlay({waypoints, onChange, onSelect}: PointsOverlayProps) {
  return <div className={"pointsOverlay .leaflet-bar"}>
    {
      waypoints.map((p, i) => {
        const optional = !(i === 0 || i === waypoints.length - 1);
        return <PointComponent key={i} point={p} index={i} onChange={onChange} onSelect={onSelect}
                               optional={optional}/>;
      })
    }
  </div>;
}