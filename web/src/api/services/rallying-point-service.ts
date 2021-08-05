import { get, post } from "@/api/http";
import { RallyingPoint } from "@/api/";

/**
 * Class that manages rallying points.
 */
export class RallyingPointService {

  /**
   * Adds a rallying point.
   */
  static async add(lat: number, lng: number, name: string) {
    await post("/api/rp/add", { params: { lat, lng, name } });
  }

  /**
   * Deletes a rallying point.
   */
  static async delete(id: string) {
    await post("/api/rp/delete", { params: { id } });
  }

  /**
   * Moves a rallying point to specific coordinates.
   */
  static async move(id: string, lat: number, lng: number) {
    console.log(lat, lng);
    await post("/api/rp/move", { params: { lat, lng, id } });
  }

  /**
   * Changes the state of a rallying point.
   */
  static async state(id: string, isActive: boolean) {
    await post("/api/rp/state", { params: { id, isActive } });
  }

  /**
   * Re-creates every rallying points from exported file.
   * All modifications will be lost.
   */
  static async generate() {
    await post("/api/rp/generate");
  }

  /**
   * Lists all close rallying points.
   */
  static async list(lat: number, lng: number): Promise<RallyingPoint[]> {
    return get("/api/rp/list", { params: { lat, lng } });
  }

}
