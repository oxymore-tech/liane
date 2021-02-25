import { LatLngExpression } from "leaflet";
import { LatLng, RallyingPoint, Trip } from ".";
import { BaseUrl } from "./url";

class DisplayService {

    async SnapPosition(lat: number, lng: number): Promise<RallyingPoint[]> {
        const url = new URL("/api/display/snap", BaseUrl);
        url.searchParams.append("lat", lat.toString());
        url.searchParams.append("lng", lng.toString());
    
        const response = await fetch(url.toString(), {
          method: "GET"
        });
        return await response.json();
      }

    async ListDestinationsFrom(id: string,  lat: number, lng: number): Promise<RallyingPoint[]> {
        const url = new URL("/api/display/listdestinations", BaseUrl);
        url.searchParams.append("id", id.toString());
        url.searchParams.append("lat", lat.toString());
        url.searchParams.append("lng", lng.toString());
    
        const response = await fetch(url.toString(), {
          method: "GET"
        });
        return await response.json();
      }

    async ListTripsFrom(id: string,  lat: number, lng: number): Promise<Trip[]> {
        const url = new URL("/api/display/listtrips", BaseUrl);
        url.searchParams.append("id", id.toString());
        url.searchParams.append("lat", lat.toString());
        url.searchParams.append("lng", lng.toString());
        
        const response = await fetch(url.toString(), {
          method: "GET"
        });
        return await response.json();
      }

      async ListRoutesEdgesFrom(trips: Trip[]): Promise<LatLng[][]> {
        const url = new URL("/api/display/listedges", BaseUrl);
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST", body: JSON.stringify(trips)
        });
        return Object.values(await response.json());
      }

      async ListStepsFrom(trips: Trip[]): Promise<RallyingPoint[]> {
        const url = new URL("/api/display/liststeps", BaseUrl);
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST", body: JSON.stringify(trips)
        });
        return await response.json();
      }

      async CreateStat(routesEdges : Map<string, LatLngExpression[][]>, 
                       day : string, 
                       hour1 : number = 0,  
                       hour2 : number = 24): Promise<number[]> {
        const url = new URL("/api/display/stats", BaseUrl);
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST", body: JSON.stringify({routes : routesEdges, day : day, hour1 : hour1, hour2 : hour2})
        });
        return await response.json();
      }
}

export const displayService = new DisplayService();