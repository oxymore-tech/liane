import { get } from "@api/http";
import { RallyingPoint } from ".";

class RallyingPointService {

  async snap(lat: number, lng: number): Promise<RallyingPoint> {
    return get("/api/rallyingPoint/snap", { params: { lat, lng } });
  }

  async get(id:string): Promise<RallyingPoint> {
    return get(`/api/rallyingPoint/${id}`);
  }

  async list(lat: number, lng: number): Promise<RallyingPoint[]> {
    return get("/api/rallyingPoint", { params: { lat, lng } });
  }

}

export const rallyingPointService = new RallyingPointService();