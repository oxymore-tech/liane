"use client";

import { Layer, Source } from "react-map-gl/maplibre";

const TILES_URL =
  process.env.NEXT_PUBLIC_TILES_URL ?? "http://localhost:3001";

export function RallyingPointsLayer() {
  return (
    <Source
      id="rallying_points"
      type="vector"
      tiles={[`${TILES_URL}/rallying_point_display/{z}/{x}/{y}`]}
      minzoom={8}
      maxzoom={14}
    >
      <Layer
        id="rallying-points-circle"
        type="circle"
        source-layer="rallying_point_display"
        minzoom={8}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2, 14, 6],
          "circle-color": "#10b981",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#065f46",
        }}
      />
      <Layer
        id="rallying-points-label"
        type="symbol"
        source-layer="rallying_point_display"
        minzoom={12}
        layout={{
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-max-width": 8,
        }}
        paint={{
          "text-color": "#1f2937",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        }}
      />
    </Source>
  );
}
