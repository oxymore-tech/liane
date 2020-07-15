import { LatLngLiteral } from "leaflet";
import React, { useState } from "react";

export interface Point {
  readonly coordinate: LatLngLiteral;
  readonly address: string;
  readonly exclude: boolean;
}

export interface PointComponentProps {
  index: number,
  point: Point,
  optional: boolean,
  onChange: (i: number, p: Point) => void
  onSelect: (i: number) => void
}

export function PointComponent({index, point, optional, onChange, onSelect}: PointComponentProps) {
  const [modifiedPoint, setModifiedPoint] = useState(point);

  function excludeClick() {
    setModifiedPoint(point => ({...point, exclude: !point.exclude}));
    onChange(index, modifiedPoint);
  }

  function selectClick() {
    onSelect(index);
  }

  return <>
    <div onClick={selectClick}> {JSON.stringify(point)} </div>
    {
      optional ? <button onClick={excludeClick}> {point.exclude} </button> : null
    }
  </>;
}