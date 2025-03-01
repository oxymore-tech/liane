"use client";

import React from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { FeatureCollection } from "geojson";
import { NodeAppEnv } from "@/api/env";

export type RallyingPointLayerProps = {
  features?: FeatureCollection;
  selectedFeatures?: string[];
  pin?: boolean;
};

export function RallyingPointLayer({ features, selectedFeatures = [], pin }: RallyingPointLayerProps) {
  return (
    <>
      {features ? (
        <Source type="geojson" id="rallying_point_display" data={features} />
      ) : (
        <Source type="vector" id="rallying_point_display" promoteId="id" url={NodeAppEnv.rallyingPointsTilesUrl} />
      )}
      <Layer
        id="rallying_point_clusters"
        type="symbol"
        source="rallying_point_display"
        source-layer={features ? "" : "rallying_point_display"}
        minzoom={8}
        filter={["has", "point_count"]}
        layout={{
          "icon-image": "rp_pink_blank",
          "text-size": 14,
          "text-field": ["get", "point_count"],
          "text-allow-overlap": false,
          "icon-allow-overlap": true,
          "text-anchor": "center",
          "text-max-width": 5.4,
          "text-optional": true,
          "icon-optional": false,
          "icon-anchor": "center",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 9, 0.24, 11, 0.36]
        }}
        paint={{
          "text-color": "#ffffff",
          "text-halo-color": "rgba(255, 255, 255)",
          "text-halo-width": 0.2
        }}
      />
      <Layer
        id="rallying_point_display"
        type="symbol"
        source="rallying_point_display"
        source-layer={features ? "" : "rallying_point_display"}
        filter={["!", ["has", "point_count"]]}
        layout={{
          "icon-image": pin ? "pin" : "rp_pink",
          "icon-size": pin
            ? ["interpolate", ["linear"], ["zoom"], 7, 0.8, 9, 1, 11, 2]
            : ["interpolate", ["linear"], ["zoom"], 7, 0.16, 9, 0.24, 11, 0.36],
          "icon-allow-overlap": true,
          "icon-optional": false,
          "icon-anchor": "bottom",
          "text-field": ["step", ["zoom"], "", 11, ["get", "label"]],
          "text-allow-overlap": false,
          "text-anchor": "bottom",
          "text-offset": [0, -3.4],
          "text-max-width": 5.4,
          "text-size": 12,
          "text-optional": true
        }}
        paint={{
          "text-halo-width": 1.5,
          "text-color": ["case", ["in", ["get", "id"], ["literal", selectedFeatures]], "#0891b2", ["get", "isActive"], "#52070c", "#333333"],
          "text-halo-color": "#fff",
          "icon-color": ["case", ["in", ["get", "id"], ["literal", selectedFeatures]], "#0891b2", ["get", "isActive"], "#ff787b", "#666666"],
          "icon-halo-color": pin ? "#1e2939" : "#fff",
          "icon-halo-width": 0.6
        }}
      />
    </>
  );
}
