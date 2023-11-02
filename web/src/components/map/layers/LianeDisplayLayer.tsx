"use client";

import { useMapContext } from "@/components/map/Map";
import { useEffect, useMemo } from "react";
import { NodeAppEnv } from "@/api/env";

export type LianeDisplayLayerProps = {
  date: Date;
};

const getDateParams = (date: Date) =>
  "offset=" +
  date.getTimezoneOffset() +
  "&day=" +
  date.getFullYear() +
  "-" +
  (1 + date.getMonth()).toString().padStart(2, "0") +
  "-" +
  date.getDate().toString().padStart(2, "0");
export function LianeDisplayLayer({ date }: LianeDisplayLayerProps) {
  const map = useMapContext();
  const args = useMemo(() => getDateParams(date), [date]);
  useEffect(() => {
    const url = NodeAppEnv.tilesUrl + "/liane_display?" + args;
    map.current?.once("load", () => {
      if (!map.current || map.current?.getSource("liane_display")) {
        return;
      }
      map.current?.addSource("liane_display", {
        type: "vector",
        url
      });
      map.current?.addLayer({
        id: "liane_display",
        "source-layer": "liane_display",
        source: "liane_display",
        type: "line",
        paint: {
          "line-color": "#131870",
          "line-width": 3
        }
      });
      return () => {
        map.current?.removeLayer("liane_display");
        map.current?.removeSource("liane_display");
      };
    });
  }, [map, args]);
  return <></>;
}
