"use client";

import React from "react";
import { MapGeoJSONFeature } from "maplibre-gl";
import { Layer, Source } from "react-map-gl/maplibre";
import { FeatureCollection } from "geojson";
import { EmptyFeatureCollection } from "@liane/common";

export type RallyingPointRequestLayerProps = {
  features?: FeatureCollection;
  selectedFeatures?: string[];
  highlightedFeatures?: MapGeoJSONFeature[];
};

export function RallyingPointRequestLayer({ features, selectedFeatures = [] }: RallyingPointRequestLayerProps) {
  return (
    <>
      <Source type="geojson" id="rallying_points_requests" promoteId="id" data={features ?? EmptyFeatureCollection} />
      <Layer
        id="rallying_points_requests"
        type="symbol"
        source="rallying_points_requests"
        layout={{
          "icon-image": "pin",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.8, 9, 1, 11, 2],
          "icon-allow-overlap": true,
          "icon-optional": false,
          "icon-anchor": "bottom",
          "text-optional": true
        }}
        paint={{
          "icon-color": ["case", ["in", ["get", "id"], ["literal", selectedFeatures]], "#0094ff", "#ffdf20"],
          "icon-halo-color": "#1e2939",
          "icon-halo-width": 0.6
        }}
      />
    </>
  );
}
