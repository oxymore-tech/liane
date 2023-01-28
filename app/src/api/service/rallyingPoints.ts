import { LatLng, RallyingPoint } from "@/api";
import { get } from "@/api/http";

export interface RallyingPointService {
  search(search: string, location: LatLng): Promise<RallyingPoint[]>;
}

export class RallyingPointClient implements RallyingPointService {
  async search(search: string, location: LatLng): Promise<RallyingPoint[]> {
    return get("/rallying_point", { params: { search, lng: location?.lng, lat: location?.lat } });
  }
}
