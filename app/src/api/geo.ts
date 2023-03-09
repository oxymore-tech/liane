import { LatLng } from "@/api/index";
import { GeoJSON } from "geojson";

export type BoudingBox = Readonly<{
  from: LatLng;
  to: LatLng;
}>;

export function bboxToLatLng(bbox: GeoJSON.Position[]): BoudingBox {
  const [[lng, lat], [lng2, lat2]] = bbox;
  return {
    from: { lat, lng },
    to: { lat: lat2, lng: lng2 }
  };
}

export function toGeoJson(latLng: LatLng): GeoJSON.Position {
  return [latLng.lng, latLng.lat];
}
