import { LatLngLiteral } from "leaflet";

export interface RoutingQuery {
  readonly start: LatLngLiteral;
  readonly end: LatLngLiteral;
}