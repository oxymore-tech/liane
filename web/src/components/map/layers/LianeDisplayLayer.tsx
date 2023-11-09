"use client";

import { useMapContext } from "@/components/map/Map";
import { useEffect, useMemo } from "react";
import { NodeAppEnv } from "@/api/env";
import { VectorSourceSpecification } from "maplibre-gl";
import { AppEnv } from "@liane/common";

export type LianeDisplayLayerProps = {
  date: Date;
};

export function LianeDisplayLayer({ date }: LianeDisplayLayerProps) {
  const map = useMapContext();
  const args = useMemo(() => AppEnv.getLayerDateParams(date), [date]);
  useEffect(() => {
    const url = NodeAppEnv.lianeTilesUrl;
    map.current?.once("load", () => {
      if (!map.current || map.current?.getSource("liane_display")) {
        return;
      }
      map.current?.addSource("liane_display", {
        type: "vector",
        tiles: [url + "/{z}/{x}/{y}"]
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
  }, [map]);
  useEffect(() => {
    const lianeSource = map.current?.getSource("liane_display");
    if (map.current && lianeSource) {
      const url = NodeAppEnv.lianeTilesUrl + "/{z}/{x}/{y}?" + args;
      (lianeSource as VectorSourceSpecification).tiles = [url];
      map.current.style.sourceCaches["liane_display"].clearTiles();
      // Load the new tiles for the current viewport (map.transform -> viewport)
      map.current.style.sourceCaches["liane_display"].update(map.current.transform);
      map.current.triggerRepaint();
    }
  }, [args]);
  return <></>;
}
