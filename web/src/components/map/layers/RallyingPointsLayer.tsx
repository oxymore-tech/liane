"use client";

import { useMapContext } from "@/components/map/Map";
import { useEffect } from "react";
import { NodeAppEnv } from "@/api/env";

export type RallyingPointsLayerProps = {};

export function RallyingPointsLayer({}: RallyingPointsLayerProps) {
  const map = useMapContext();

  useEffect(() => {
    const url = NodeAppEnv.tilesUrl + "/rallying_point_display";
    map.current?.once("load", () => {
      if (map.current?.getSource("rallying_point_display")) {
        return;
      }
      map.current?.addSource("rallying_point_display", {
        type: "vector",
        url
      });

      map.current?.loadImage("/rp_pink.png", function (error, image) {
        if (error) throw error;

        if (!image) console.warn("No image found");
        else map.current?.addImage("rp_active", image);
      });

      map.current?.loadImage("/rp_gray.png", function (error, image) {
        if (error) throw error;

        if (!image) console.warn("No image found");
        else map.current?.addImage("rp_inactive", image);
      });
      map.current?.addLayer({
        id: "rallying_point_display_small",
        "source-layer": "rallying_point_display",
        source: "rallying_point_display",
        type: "circle",
        maxzoom: 11,
        minzoom: 7,
        paint: { "circle-radius": 4, "circle-color": "#e35374" }
      });
      map.current?.addLayer({
        id: "rallying_point_display",
        "source-layer": "rallying_point_display",
        source: "rallying_point_display",
        type: "symbol",
        minzoom: 11,
        layout: {
          "icon-image": "rp_active",
          "text-size": 12,
          "icon-size": 0.36,
          "text-field": ["get", "label"],
          "text-allow-overlap": false,
          "icon-allow-overlap": true,
          "text-anchor": "bottom",
          "text-offset": [0, -3.4],
          "text-max-width": 5.4,
          "text-optional": true,
          "icon-optional": false,
          "icon-anchor": "bottom"
        },
        paint: { "text-halo-width": 1.5, "text-color": "#52070c", "text-halo-color": "#fff" }
      });

      return () => {
        map.current?.removeImage("rp_active");
        map.current?.removeImage("rp_inactive");
        map.current?.removeLayer("rallying_point_display");
        map.current?.removeLayer("rallying_point_display_small");
        map.current?.removeSource("rallying_point_display");
      };
    });
  }, [map]);
  return <></>;
}
