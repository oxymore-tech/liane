import { LatLng, RallyingPoint } from "./api";
import { FeatureCollection } from "geojson";
import { HttpClient } from "./http";

export interface RallyingPointService {
  search(search: string, location?: LatLng): Promise<RallyingPoint[]>;
  view(lowerLeft: LatLng, upperRight: LatLng): Promise<FeatureCollection>;
  snap(location: LatLng): Promise<RallyingPoint>;
}

export class RallyingPointClient implements RallyingPointService {
  constructor(private http: HttpClient) {}

  async search(search: string, location?: LatLng): Promise<RallyingPoint[]> {
    const res = await this.http.get<RallyingPoint[]>("/rallying_point", { params: { search, lng: location?.lng, lat: location?.lat } });
    if (res.length === 0) {
      return this.http.get<RallyingPoint[]>("/rallying_point", { params: { search } });
    }
    return res;
  }

  snap(location: LatLng): Promise<RallyingPoint> {
    return this.http.get("/rallying_point/snap", { params: { lng: location.lng, lat: location.lat } });
  }

  view(lowerLeft: LatLng, upperRight: LatLng): Promise<FeatureCollection> {
    return this.http.get("/rallying_point/geojson", {
      params: { lng: lowerLeft.lng, lat: lowerLeft.lat, lng2: upperRight.lng, lat2: upperRight.lat, limit: 100 }
    });
  }
}