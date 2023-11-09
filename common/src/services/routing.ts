import { LatLng, RallyingPoint } from "../api";
import { HttpClient } from "./http";
// @ts-ignore
import { GeoJSON, Position } from "geojson";

export type Route = {
  geometry: GeoJSON.MultiLineString;
};

type RawRouteResponse = {
  coordinates: Position[][];
};
export interface RoutingService {
  getRoute(points: LatLng[]): Promise<Route>;
  duration(from: RallyingPoint, to: RallyingPoint): Promise<number>;
}

export class RoutingServiceClient implements RoutingService {
  constructor(private http: HttpClient) {}

  async getRoute(pointsCoordinates: LatLng[]): Promise<Route> {
    const { coordinates } = await this.http.postAs<RawRouteResponse>("/basicRoute/", { body: { coordinates: pointsCoordinates } });
    return { geometry: { coordinates, type: "MultiLineString" } };
  }

  duration(from: RallyingPoint, to: RallyingPoint): Promise<number> {
    return this.http.get("/basicRoute/duration", {
      params: { lngFrom: from.location.lng, latFrom: from.location.lat, lngTo: to.location.lng, latTo: to.location.lat }
    });
  }
}
