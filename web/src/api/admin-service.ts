import { get, post, postAs } from "@/api/http";
import { RawTrip, RawTripFilterOptions } from ".";

class AdminService {

  async getAllRawTrips() : Promise<RawTrip[]> {
    return get("/api/raw/all");
  }

  async snapRawTrips(filter: RawTripFilterOptions) : Promise<RawTrip[]> {
    return postAs("/api/raw/snap", { body: filter });
  }

  async generateLianes() {
    return post("/api/liane/generate");
  }

}

export const adminService = new AdminService();