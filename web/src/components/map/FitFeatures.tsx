import { useMapContext } from "@/components/map/Map";
import React, { useEffect } from "react";
import bbox from "@turf/bbox";
import { EmptyFeatureCollection } from "@liane/common";
import buffer from "@turf/buffer";
import { Feature } from "geojson";

export const FitFeatures = ({ features }: { features: Feature[] }) => {
  useFitFeatures(features);
  return <></>;
};

export const useFitFeatures = (features: Feature[]) => {
  const map = useMapContext();
  useEffect(() => {
    map.current?.once("idle", () => {
      if (features.length === 1 && features[0].geometry.type === "Point") {
        const coords = features[0].geometry.coordinates;
        map.current?.flyTo({ center: [coords[0], coords[1]], animate: true });
      } else if (features.length > 0) {
        // Use buffer to fit the given features inside the map's bounds as fitBounds does the opposite
        const box = bbox(buffer({ ...EmptyFeatureCollection, features }, 1));

        if (box.every(n => Number.isFinite(n))) {
          map.current?.fitBounds(
            [
              [box[0], box[1]],
              [box[2], box[3]]
            ],
            { padding: 32, animate: true }
          );
        }
      }
    });
  }, [map, features]);
};
