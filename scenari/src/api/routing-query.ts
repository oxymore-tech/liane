import { LatLngLiteral } from "leaflet";

export class RoutingQuery {
  readonly start: LatLngLiteral;
  readonly end: LatLngLiteral;
  readonly point?: LatLngLiteral;
  readonly duration?: number;
  readonly distance?: number;
  readonly coordinates?: LatLngLiteral[];
  
  constructor(start: LatLngLiteral , end: LatLngLiteral,point?: LatLngLiteral, duration?: number, distance?: number, coordinates?: LatLngLiteral[]){
    this.start = start;
    this.end = end;
    this.point = point;
    this.duration = duration;
    this.distance = distance;
    this.coordinates = coordinates;
    
  }
}