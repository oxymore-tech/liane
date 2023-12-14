import { useMapContext } from "@/components/map/Map";
import React, { useEffect } from "react";
import bbox from "@turf/bbox";
import { EmptyFeatureCollection } from "@liane/common";
import buffer from "@turf/buffer";
import { BBox, Feature } from "geojson";
import { LngLatBoundsLike } from "maplibre-gl";
import envelope from "@turf/envelope";
import distance from "@turf/distance";

export const FitFeatures = ({ features, setMaxBounds }: { features: Feature[]; setMaxBounds?: boolean }) => {
  useFitFeatures(features, setMaxBounds ?? false);
  return <></>;
};

export const useFitFeatures = (features: Feature[], maxBounds: boolean) => {
  // console.log("render fit");
  const map = useMapContext();

  useEffect(() => {
    map.current?.once("idle", () => {
      const bounds = getBounds(features);
      if (features.length === 1 && features[0].geometry.type === "Point") {
        const coords = features[0].geometry.coordinates;
        map.current?.flyTo({ center: [coords[0], coords[1]], animate: true });
      } else if (features.length > 0 && bounds) {
        map.current?.fitBounds(bounds, { animate: true });
        if (maxBounds) {
          // const box2 = bbox(buffer(e, diag * 0.2, { units: "kilometers" }));
          map.current?.once("idle", () => {
            requestAnimationFrame(() => {
              map.current?.setMaxBounds(bounds);
            });
          });
        }
      }
    });
  }, [map, features]);
};

export const bboxToLngLatBoundsLike = (box: BBox): LngLatBoundsLike => [
  [box[0], box[1]],
  [box[2], box[3]]
];

export const getBounds = (features: Feature[]) => {
  if (features.length === 1 && features[0].geometry.type === "Point") {
    return null;
  } else if (features.length > 0) {
    const e = envelope({ ...EmptyFeatureCollection, features });
    let diag = distance([e.bbox![0], e.bbox![1]], [e.bbox![2], e.bbox![3]], { units: "kilometers" });
    diag = Number.isFinite(diag) ? diag : 1;
    // Use buffer to fit the given features inside the map's bounds as fitBounds does the opposite
    const box = bbox(buffer(e, diag * 0.1, { units: "kilometers" }));
    if (box.every(n => Number.isFinite(n))) {
      return bboxToLngLatBoundsLike(box);
    }
  }
  return null;
};
