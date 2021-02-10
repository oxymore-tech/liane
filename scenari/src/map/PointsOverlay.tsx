import React from "react";
import {Point, PointComponent} from "map/Point";
import styles from "./PointOverlay.module.css";
import {Scenario} from "../api/scenario";

export interface PointsOverlayProps {
  waypoints: Point[],
  scenario: Scenario,
  children?: JSX.Element,
  onChange: (i: number, p: Point) => void
  onSelect: (i: number) => void
  onInput: (a: string) => void
}

export function PointsOverlay({waypoints, scenario, children, onChange, onSelect, onInput}: PointsOverlayProps) {
  return <div className="points-overlay">
    <div className={styles.container}>
      {

        waypoints.map((p, i) => {
          if (i === 0 || i === waypoints.length - 1) {
            return <>{i===0?"Start":"End"} :<PointComponent className={styles.pointComponent}
                                   key={i} point={p} index={i} onChange={onChange} onSelect={onSelect}
                                   onInput={onInput}
                                   optional={false}/></>;
          }
          if (scenario !== Scenario.defaultRoute && scenario !== Scenario.alternatives) {
            return <PointComponent className={styles.pointComponent}
                                   key={i} point={p} index={i} onChange={onChange} onSelect={onSelect}
                                   onInput={onInput}
                                   optional={true}/>;
          } else {
            return <></>;
          }

        })
      }
    </div>
    {children}
  </div>;
}
