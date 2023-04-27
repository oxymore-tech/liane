import { LatLng } from "@/api/index";
import { GeoJSON } from "geojson";

export type BoundingBox = Readonly<{
  from: LatLng;
  to: LatLng;
}>;

export function fromPositions(bbox: GeoJSON.Position[]): BoundingBox {
  const [upperLeft, bottomRight] = bbox;
  return {
    to: toLatLng(upperLeft), //maxs
    from: toLatLng(bottomRight) //mins
  };
}

export function toLatLng(position: GeoJSON.Position): LatLng {
  const [lng, lat] = position;
  return { lat, lng };
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
