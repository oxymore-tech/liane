import { LatLng } from "../api";
import { FeatureCollection, Position } from "geojson";
import turfDistance from "@turf/distance";
import { point } from "@turf/helpers";

export type BoundingBox = {
  min: LatLng;
  max: LatLng;
};

export function toLatLng(position: Position): LatLng {
  const [lng, lat] = position;
  return { lat, lng };
}

/**
 * Get the square bouding box around the given center
 */
export function fromPositions(bbox: Position[], center: Position): BoundingBox {
  const [upperLeft, bottomRight] = bbox;
  const delta = Math.abs(upperLeft[0] - bottomRight[0]) / 2;

  return {
    max: toLatLng([upperLeft[0], center[1] - delta]),
    min: toLatLng([bottomRight[0], center[1] + delta])
  };
}

export function contains(bbox: BoundingBox, coordinate: LatLng) {
  return coordinate.lat <= bbox.max.lat && coordinate.lat >= bbox.min.lat && coordinate.lng <= bbox.max.lng && coordinate.lng >= bbox.min.lng;
}

export function isWithinBox(bbox: BoundingBox, bbox2: BoundingBox) {
  return bbox.min.lat >= bbox2.min.lat && bbox.min.lng >= bbox2.min.lng && bbox.max.lat <= bbox2.max.lat && bbox.max.lng <= bbox2.max.lng;
}
export const getCenter = (bbox: BoundingBox) => {
  return { lng: (bbox.min.lng + bbox.max.lng) / 2, lat: (bbox.min.lat + bbox.max.lat) / 2 };
};

export interface CameraPadding {
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
}

export type DisplayBoundingBox = Required<CameraPadding> & { ne: Position; sw: Position };
export const getBoundingBox = (coordinates: Position[], padding: number = 0): DisplayBoundingBox => {
  const sw = [90, 90];
  const ne = [-90, -90];
  for (const [lng, lat] of coordinates) {
    if (lng < sw[0]) {
      sw[0] = lng;
    }
    if (lng > ne[0]) {
      ne[0] = lng;
    }
    if (lat < sw[1]) {
      sw[1] = lat;
    }
    if (lat > ne[1]) {
      ne[1] = lat;
    }
  }
  return { sw, ne, paddingTop: padding, paddingRight: padding, paddingBottom: padding, paddingLeft: padding };
};

export const fromBoundingBox = (bbox: BoundingBox): { ne: [number, number]; sw: [number, number] } => {
  return { sw: [bbox.min.lng, bbox.min.lat], ne: [bbox.max.lng, bbox.max.lat] };
};

export const isFeatureCollection = (x: any): x is FeatureCollection => {
  return x.type && x.type === "FeatureCollection";
};

export function intersect(a: Iterable<any>, b: Iterable<any>) {
  const setB = new Set(b);
  const intersection = new Set(Array.from(a).filter(x => setB.has(x)));
  return Array.from(intersection);
}

export const distance = (p1: LatLng, p2: LatLng) => turfDistance(point([p1.lng, p1.lat]), point([p2.lng, p2.lat]), { units: "meters" });

export const asPoint = (p: LatLng) => point([p.lng, p.lat]);

export const EmptyFeatureCollection = <FeatureCollection>{
  type: "FeatureCollection",
  features: []
};
