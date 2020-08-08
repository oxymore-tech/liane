import { RoutingQuery } from "api/routing-query";
import { Route } from "api/route";
import { BaseUrl } from "./url";

class RoutingService {

  async DefaultRouteMethod(query: RoutingQuery, scenario: string = "route"): Promise<Route> {
    const response = await fetch(`${BaseUrl}/api/${scenario}`, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify(query)
    });
    return await response.json();
  }

  async GetAlternatives(query: RoutingQuery): Promise<Route[]> {
    const response = await fetch(`${BaseUrl}/api/alternatives`, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify(query)
    });
    return await response.json();
  }

}


export const routingService = new RoutingService();