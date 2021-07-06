import { postAs } from "@/api/http";
import { Route, RoutingQuery, UserLocation } from "@/api/index";

class RoutingService {

  async route(locations: UserLocation[]): Promise<Route> {
    return postAs("/api/route", { body: locations });
  }

  async basicRouteMethod(routingQuery: RoutingQuery): Promise<Route> {
    return postAs("/api/basicRoute", { body: routingQuery });
  }

}

export const routingService = new RoutingService();