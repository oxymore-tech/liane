import { LatLng } from "leaflet";

export interface Route {
  readonly coordinates: LatLng[];
  readonly duration: number;
  readonly distance: number;
  readonly delta?: number;
}