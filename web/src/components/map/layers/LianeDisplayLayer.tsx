"use client";

import { useMemo } from "react";
import { NodeAppEnv } from "@/api/env";
import { AppEnv, DayOfWeekFlag } from "@liane/common";
import { Layer, Source } from "react-map-gl/maplibre";

export type LianeDisplayLayerProps = {
  weekDays?: DayOfWeekFlag;
};

export function LianeDisplayLayer({ weekDays }: LianeDisplayLayerProps) {
  const params = useMemo(() => AppEnv.getLianeDisplayParams(weekDays), [weekDays]);
  return (
    <>
      <Source id="liane_display" type="vector" tiles={[NodeAppEnv.lianeTilesUrl + "/{z}/{x}/{y}?" + params]} />
      <Layer
        id="liane_display"
        source="liane_display"
        source-layer="liane_display"
        type="line"
        layout={{
          "line-sort-key": ["get", "count"]
        }}
        paint={{ "line-color": "#0B79F9", "line-width": 3 }}
      />
    </>
  );
}
