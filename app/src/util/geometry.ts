import { CameraPadding } from "@maplibre/maplibre-react-native";
import { GeoJSON } from "geojson";

export type BoundingBox = CameraPadding & { ne: GeoJSON.Position; sw: GeoJSON.Position };
export const getBoundingBox = (coordinates: GeoJSON.Position[], padding: number = 0): BoundingBox => {
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
