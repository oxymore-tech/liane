import { LatLng } from "../api";
import { FeatureCollection, Position } from "geojson";
import turfDistance from "@turf/distance";
import { point } from "@turf/helpers";

export type BoundingBox = Readonly<{
  from: LatLng;
  to: LatLng;
}>;

export function toLatLng(position: Position): LatLng {
  const [lng, lat] = position;
  return { lat, lng };
}

export function fromPositions(bbox: Position[]): BoundingBox {
  const [upperLeft, bottomRight] = bbox;
  return {
    to: toLatLng(upperLeft), //maxs
    from: toLatLng(bottomRight) //mins
  };
}

export function contains(bbox: BoundingBox, coordinate: LatLng) {
  return coordinate.lat <= bbox.to.lat && coordinate.lat >= bbox.from.lat && coordinate.lng <= bbox.to.lng && coordinate.lng >= bbox.from.lng;
}

export function isWithinBox(bbox: BoundingBox, bbox2: BoundingBox) {
  return bbox.from.lat >= bbox2.from.lat && bbox.from.lng >= bbox2.from.lng && bbox.to.lat <= bbox2.to.lat && bbox.to.lng <= bbox2.to.lng;
}
export const getCenter = (bbox: BoundingBox) => {
  return { lng: (bbox.from.lng + bbox.to.lng) / 2, lat: (bbox.from.lat + bbox.to.lat) / 2 };
};

export interface CameraPadding {
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
}

export type DisplayBoundingBox = Required<CameraPadding> & { ne: Position; sw: Position };
export const getBoundingBox = (coordinates: Position[], padding: number = 0): DisplayBoundingBox => {
  const sw = [1000, 1000];
  const ne = [-1000, -1000];
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
  return { sw: [bbox.from.lng, bbox.from.lat], ne: [bbox.to.lng, bbox.to.lat] };
};

export const isFeatureCollection = (x: any): x is FeatureCollection => {
  return x.type && x.type === "FeatureCollection";
};

export function intersect(a: Iterable<any>, b: Iterable<any>) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  return Array.from(intersection);
}

export const distance = (p1: LatLng, p2: LatLng) => turfDistance(point([p1.lng, p1.lat]), point([p2.lng, p2.lat]), "meters");

export const asPoint = (p: LatLng) => point([p.lng, p.lat]);

export const EmptyFeatureCollection = <FeatureCollection>{
  type: "FeatureCollection",
  features: []
};