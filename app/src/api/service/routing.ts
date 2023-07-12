import { LatLng, RallyingPoint } from "@/api";
import { get, postAs } from "@/api/http";
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
  async getRoute(pointsCoordinates: LatLng[]): Promise<Route> {
    const { coordinates } = await postAs<RawRouteResponse>("/basicRoute/", { body: { coordinates: pointsCoordinates } });
    return { geometry: { coordinates, type: "MultiLineString" } };
  }

  duration(from: RallyingPoint, to: RallyingPoint): Promise<number> {
    return get("/basicRoute/duration", {
      params: { lngFrom: from.location.lng, latFrom: from.location.lat, lngTo: to.location.lng, latTo: to.location.lat }
    });
  }
}
