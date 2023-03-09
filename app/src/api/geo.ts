import { LatLng } from "@/api/index";
import { GeoJSON } from "geojson";

export type BoudingBox = Readonly<{
  from: LatLng;
  to: LatLng;
}>;

export function bboxToLatLng(bbox: GeoJSON.Position[]): BoudingBox {
  const [upperLeft, bottomRight] = bbox;
  return {
    from: toLatLng(upperLeft),
    to: toLatLng(bottomRight)
  };
}

export function toGeoJson(latLng: LatLng): GeoJSON.Position {
  return [latLng.lng, latLng.lat];
}

export function toLatLng(position: GeoJSON.Position): LatLng {
  const [lng, lat] = position;
  return { lat, lng };
}
