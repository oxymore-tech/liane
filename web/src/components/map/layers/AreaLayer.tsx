"use client";

import React from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { FeatureCollection } from "geojson";
import { EmptyFeatureCollection } from "@liane/common";

export type AreaLayerProps = {
  features?: FeatureCollection;
};

export function AreaLayer({ features }: AreaLayerProps) {
  return (
    <>
      <Source type="geojson" id="areas" promoteId="id" data={features ?? EmptyFeatureCollection} />
      <Layer
        id="areas"
        type="fill"
        source="areas"
        beforeId="Water"
        paint={{
          "fill-outline-color": "transparent",
          "fill-color": [
            "case",
            ["==", ["get", "type"], "reachable"],
            "rgba(0,255,121,0.3)",
            ["==", ["get", "type"], "suggestion"],
            "rgba(44,44,44,0.3)",
            "transparent"
          ]
        }}
      />
    </>
  );
}
