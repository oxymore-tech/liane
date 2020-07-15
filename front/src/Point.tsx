import {LatLngLiteral} from "leaflet";
import React, {useEffect, useState} from "react";

export interface Point {
  readonly coordinate: LatLngLiteral;
  readonly address: string;
  readonly exclude: boolean;
}

export function PointComponent({onChange, index, point, optional}: { onChange: (i: number, p?: Point) => void, index: number, point: Point, optional?: boolean }) {
  const [modifiedPoint, setModifiedPoint] = useState(point);
  useEffect(()=>onChange(index, modifiedPoint),[modifiedPoint]);
  
  function excludeClick() {
    setModifiedPoint(point => ({...point, exclude: !point.exclude}));
  }

  function selectClick() {
    console.log("selectClick");
    onChange(index);
  }

  function pointOverlay(point: Point, optional: boolean) {
    return <>
      <div onClick={selectClick}> {JSON.stringify(point)} </div>
      {
        optional || false ? <button onClick={excludeClick}> {point.exclude} </button> : null
      }
    </>
  }

  return pointOverlay(point, optional || false);
}