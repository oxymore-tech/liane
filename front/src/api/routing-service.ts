import { RoutingQuery } from "./routing-query";
import { Route } from "./route";

class RoutingService {

  async basicRouteMethod(query: RoutingQuery): Promise<Route> {
    const response = await fetch("http://localhost:8081/api/route", {
      method: "POST",
      body: JSON.stringify(query)
    });
    return await response.json();
  }

}

export const routingService = new RoutingService();