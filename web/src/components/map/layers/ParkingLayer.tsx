"use client";

import React from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { FeatureCollection } from "geojson";
import { EmptyFeatureCollection } from "@liane/common";

export type ParkingLayerProps = {
  features?: FeatureCollection;
};

export function ParkingLayer({ features }: ParkingLayerProps) {
  return (
    <>
      <Source type="geojson" id="parkings" promoteId="id" data={features ?? EmptyFeatureCollection} />
      <Layer
        id="parkings"
        type="symbol"
        source="parkings"
        minzoom={10}
        layout={{
          "text-field": "P",
          "text-size": ["interpolate", ["linear"], ["get", "computed:area"], 0, 8, 500, 12, 1000, 16, 2500, 18],
          "text-optional": false,
          "text-allow-overlap": true
        }}
        paint={{
          "text-color": ["coalesce", ["get", "color"], "#000"]
        }}
      />
    </>
  );
}
