import { get, post } from "@/api/http";
import { RawTrip } from ".";

class AdminService {

  async getAllRawTrips() : Promise<RawTrip[]> {
    return get("/api/raw");
  }

  async generateLianes() {
    return post("/api/liane/generate");
  }

}

export const adminService = new AdminService();