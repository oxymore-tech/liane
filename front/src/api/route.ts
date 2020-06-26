import { GeoJSON } from "leaflet";

export interface Route {
  readonly Geojson: GeoJSON;
  readonly Duration: number;
  readonly Distance: number;
}