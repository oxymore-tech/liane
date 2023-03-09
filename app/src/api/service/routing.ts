import { LatLng } from "@/api";
import { postAs } from "@/api/http";
import { GeoJSON, Position } from "geojson";

export type Route = {
  geometry: GeoJSON.MultiLineString;
};

type RawRouteResponse = {
  coordinates: Position[][];
};
export interface RoutingService {
  getRoute(points: LatLng[]): Promise<Route>;
}

export class RoutingServiceClient implements RoutingService {
  async getRoute(pointsCoordinates: LatLng[]): Promise<Route> {
    const { coordinates } = await postAs<RawRouteResponse>("/basicRoute/", { body: { coordinates: pointsCoordinates } });
    return { geometry: { coordinates, type: "MultiLineString" } };
  }
}
