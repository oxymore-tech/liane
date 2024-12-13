"use client";

import { useMapContext } from "@/components/map/Map";
import { useEffect, useMemo } from "react";
import { NodeAppEnv } from "@/api/env";
import { VectorSourceSpecification } from "maplibre-gl";
import { AppEnv, DayOfWeekFlag } from "@liane/common";

export type LianeDisplayLayerProps = {
  weekDays?: DayOfWeekFlag;
};

export function LianeDisplayLayer({ weekDays }: LianeDisplayLayerProps) {
  const map = useMapContext();
  const params = useMemo(() => AppEnv.getLianeDisplayParams(weekDays), [weekDays]);
  useEffect(() => {
    const url = NodeAppEnv.lianeTilesUrl;
    map.current?.once("load", () => {
      if (map.current?.getSource("liane_display")) {
        return;
      }
      map.current?.addSource("liane_display", {
        type: "vector",
        tiles: [url + "/{z}/{x}/{y}?" + params]
      });
      map.current?.addLayer({
        id: "liane_display",
        "source-layer": "liane_display",
        source: "liane_display",
        type: "line",
        layout: {
          "line-sort-key": ["get", "count"]
        },
        paint: {
          "line-color": "#0B79F9",
          "line-width": 3
        }
      });
      return () => {
        map.current?.removeLayer("liane_display");
        map.current?.removeSource("liane_display");
      };
    });
  }, [map]);
  useEffect(() => {
    if (!map.current) {
      return;
    }
    const lianeSource = map.current.getSource("liane_display");
    if (lianeSource) {
      const url = NodeAppEnv.lianeTilesUrl + "/{z}/{x}/{y}?" + params;
      (lianeSource as VectorSourceSpecification).tiles = [url];
      map.current.style.sourceCaches["liane_display"].clearTiles();
      // Load the new tiles for the current viewport (map.transform -> viewport)
      map.current.style.sourceCaches["liane_display"].update(map.current.transform);
      map.current.triggerRepaint();
    }
  }, [map, params]);
  return <></>;
}
