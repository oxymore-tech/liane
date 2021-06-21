import { get } from "@/api/http";
import { RawTrip } from ".";

class AdminService {

  async getAllRawTrips() : Promise<RawTrip[]> {
    return get("/api/raw");
  }

}

export const adminService = new AdminService();