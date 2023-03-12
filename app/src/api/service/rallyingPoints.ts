import { LatLng, RallyingPoint } from "@/api";
import { get } from "@/api/http";

export interface RallyingPointService {
  search(search: string, location?: LatLng): Promise<RallyingPoint[]>;

  //  view(lowerLeft: LatLng, upperRight: LatLng): Promise<RallyingPoint[]>;

  snap(location: LatLng): Promise<RallyingPoint>;
}

export class RallyingPointClient implements RallyingPointService {
  search(search: string, location?: LatLng): Promise<RallyingPoint[]> {
    return get("/rallying_point", { params: { search, lng: location?.lng, lat: location?.lat } });
  }

  snap(location: LatLng): Promise<RallyingPoint> {
    return get("/rallying_point/snap", { params: { lng: location.lng, lat: location.lat } });
  }
  /* view(lowerLeft: LatLng, upperRight: LatLng): Promise<RallyingPoint[]> {
    return get("/rallying_point/view", { params: { ll: `${lowerLeft.lng},${lowerLeft.lat}`, ur: `${upperRight.lng},${upperRight.lat}` } });
  }*/
}
