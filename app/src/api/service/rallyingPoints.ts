import { LatLng, RallyingPoint } from "@/api";
import { get } from "@/api/http";

export interface RallyingPointService {
  search(search: string, location?: LatLng): Promise<RallyingPoint[]>;
  view(lowerLeft: LatLng, upperRight: LatLng): Promise<RallyingPoint[]>;
  snap(location: LatLng): Promise<RallyingPoint>;
}

export class RallyingPointClient implements RallyingPointService {
  async search(search: string, location?: LatLng): Promise<RallyingPoint[]> {
    const res = await get<RallyingPoint[]>("/rallying_point", { params: { search, lng: location?.lng, lat: location?.lat } });
    if (res.length === 0) {
      return get<RallyingPoint[]>("/rallying_point", { params: { search } });
    }
    return res;
  }

  snap(location: LatLng): Promise<RallyingPoint> {
    return get("/rallying_point/snap", { params: { lng: location.lng, lat: location.lat } });
  }

  view(lowerLeft: LatLng, upperRight: LatLng): Promise<RallyingPoint[]> {
    return get("/rallying_point", { params: { lng: lowerLeft.lng, lat: lowerLeft.lat, lng2: upperRight.lng, lat2: upperRight.lat, limit: 100 } });
  }
}
