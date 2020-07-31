import React from "react";
import { Point, PointComponent } from "map/Point";
import styles from "./PointOverlay.module.css";

export interface PointsOverlayProps {
  waypoints: Point[],
  children?: JSX.Element,
  onChange: (i: number, p: Point) => void
  onSelect: (i: number) => void
  onInput: (a: string) => void
}

export function PointsOverlay({waypoints, children, onChange, onSelect, onInput}: PointsOverlayProps) {
  return <div className="points-overlay">
    <div className={styles.container}>
      {
        waypoints.map((p, i) => {
          const optional = !(i === 0 || i === waypoints.length - 1);
          return <PointComponent className={styles.pointComponent}
                                 key={i} point={p} index={i} onChange={onChange} onSelect={onSelect}
                                 onInput={onInput}
                                 optional={optional}/>;
        })
      }
    </div>
    {children}
  </div>;
}
