import { LatLng, PaginatedResponse, RallyingPoint, RallyingPointRequest } from "../api";
import { FeatureCollection } from "geojson";
import { HttpClient } from "./http";

export interface RallyingPointService {
  search(search: string, location?: LatLng): Promise<RallyingPoint[]>;
  list(query: { search?: string; location?: LatLng; offset?: number; limit?: number }): Promise<PaginatedResponse<RallyingPoint>>;
  view(lowerLeft: LatLng, upperRight: LatLng): Promise<FeatureCollection>;
  snap(location: LatLng): Promise<RallyingPoint>;
  postRequest(request: RallyingPointRequest): Promise<void>;
}

export class RallyingPointClient implements RallyingPointService {
  constructor(private http: HttpClient) {}

  async search(search: string, location?: LatLng): Promise<RallyingPoint[]> {
    const res = await this.list({ search, location });
    if (res.data.length === 0) {
      return (await this.list({ search })).data;
    }
    return res.data;
  }

  list({
    search,
    location,
    offset,
    limit
  }: {
    search?: string;
    location?: LatLng;
    offset?: number;
    limit?: number;
  }): Promise<PaginatedResponse<RallyingPoint>> {
    return this.http.get<PaginatedResponse<RallyingPoint>>("/rallying_point", {
      params: { search, lng: location?.lng, lat: location?.lat, offset, limit }
    });
  }
  snap(location: LatLng): Promise<RallyingPoint> {
    return this.http.get("/rallying_point/snap", { params: { lng: location.lng, lat: location.lat } });
  }

  view(lowerLeft: LatLng, upperRight: LatLng): Promise<FeatureCollection> {
    return this.http.get("/rallying_point/geojson", {
      params: { lng: lowerLeft.lng, lat: lowerLeft.lat, lng2: upperRight.lng, lat2: upperRight.lat, limit: 100 }
    });
  }
  postRequest(request: RallyingPointRequest): Promise<void> {
    return this.http.postAs("/rallying_point/request", { body: request });
  }
}
