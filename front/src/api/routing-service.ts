import { RoutingQuery } from "api/routing-query";
import { Route } from "api/route";

class RoutingService {

  async DefaultRouteMethod(query: RoutingQuery, scenario: string="route"): Promise<Route> {
    const response = await fetch("http://localhost:8081/api/"+scenario, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify(query)
    });
    return await response.json();
  }
  async GetAlternatives(query: RoutingQuery): Promise<Route[]> {
    const response = await fetch("http://localhost:8081/api/alternatives", {
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