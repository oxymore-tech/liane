"use client";

import { Layer, Source } from "react-map-gl/maplibre";
import { MAP_FONT, tilesUrl } from "./map-style";

const RALLYING_POINTS_LAYER_ID = "rallying-points-circle";

export function RallyingPointsLayer() {
  return (
    <Source
      id="rallying_points"
      type="vector"
      tiles={[tilesUrl("rallying_point_display")]}
      minzoom={8}
      maxzoom={14}
    >
      <Layer
        id={RALLYING_POINTS_LAYER_ID}
        type="circle"
        source-layer="rallying_point_display"
        minzoom={8}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 14, 8],
          "circle-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#6b7280",
        }}
      />
      <Layer
        id="rallying-points-label"
        type="symbol"
        source-layer="rallying_point_display"
        minzoom={9}
        layout={{
          "text-field": ["get", "city"],
          "text-font": MAP_FONT,
          "text-size": 11,
          "text-offset": [0, 0.9],
          "text-anchor": "top",
          "text-max-width": 8,
        }}
        paint={{
          "text-color": "#4b5563",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
        }}
      />
    </Source>
  );
}
