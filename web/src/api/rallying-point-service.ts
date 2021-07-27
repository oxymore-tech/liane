import { get } from "@/api/http";
import { RallyingPoint } from ".";

export class RallyingPointService {

  static async snap(lat: number, lng: number): Promise<RallyingPoint> {
    return get("/api/rallyingPoint/snap", { params: { lat, lng } });
  }

  static async get(id:string): Promise<RallyingPoint> {
    return get(`/api/rallyingPoint/${id}`);
  }

  static async list(lat: number, lng: number): Promise<RallyingPoint[]> {
    return get("/api/rallyingPoint", { params: { lat, lng } });
  }

}
