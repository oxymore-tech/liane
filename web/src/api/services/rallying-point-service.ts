import { get, post, put, remove } from "@/api/http";
import { RallyingPoint } from "@/api/";

/**
 * Class to manages rallying points.
 */
export class RallyingPointService {

  static async create(label: string, lat: number, lng: number, isActive: boolean = true) {
    await post("/api/rallying_point", { params: { location: { lat, lng }, label, isActive } as RallyingPoint });
  }
  
  static async delete(id: string) {
    await remove(`/api/rallying_point/${id}`);
  }
  
  static async list(lat?: number, lng?: number, search?: string): Promise<RallyingPoint[]> {
    return get("/api/rallying_point", { params: { lat, lng, search } });
  }
  
  static async update(id: string, label: string, lat: number, lng: number, isActive: boolean) {
    return put(`/api/rallying_point/${id}`, { params: { location: { lat, lng }, label, isActive } as RallyingPoint });
  }
  
  static async generate() {
    await post("/api/rallying_point/generate");
  }

}
