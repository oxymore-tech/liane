import { postAs } from "@/api/http";
import { Route, UserLocation } from "@/api/index";

class RoutingService {

  async route(locations: UserLocation[]): Promise<Route> {
    return postAs("/api/route", { body: locations });
  }

}

export const routingService = new RoutingService();