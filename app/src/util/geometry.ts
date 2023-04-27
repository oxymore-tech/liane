import { CameraPadding } from "@maplibre/maplibre-react-native";
import { Feature, FeatureCollection, GeoJSON, GeoJsonProperties, Geometry } from "geojson";
import { BoundingBox } from "@/api/geo";

export type DisplayBoundingBox = Required<CameraPadding> & { ne: GeoJSON.Position; sw: GeoJSON.Position };
export const getBoundingBox = (coordinates: GeoJSON.Position[], padding: number = 0): DisplayBoundingBox => {
  let sw = [1000, 1000];
  let ne = [-1000, -1000];
  for (let [lng, lat] of coordinates) {
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

export function intersect(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  return Array.from(intersection);
}

export const EmptyFeatureCollection = <FeatureCollection>{
  type: "FeatureCollection",
  features: []
};
