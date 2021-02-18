import { LatLngExpression } from "leaflet";
import { RallyingPoint, Trip } from ".";
import { BaseUrl } from "./url";

class DisplayService {

    async SnapPosition(lat: number, lng: number): Promise<RallyingPoint[]> {
        const url = new URL("/api/display/snap", BaseUrl);
        url.searchParams.append("lat", lat.toString());
        url.searchParams.append("lng", lng.toString());
    
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          },
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
          headers: {
            "Content-Type": "application/json"
          },
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
          headers: {
            "Content-Type": "application/json"
          },
          method: "GET"
        });
        return await response.json();
      }

      async ListRoutesEdgesFrom(trips: Trip[]): Promise<Map<string, LatLngExpression[][]>> {
        const url = new URL("/api/display/listedges", BaseUrl);
        url.searchParams.append("id", trips.toString());
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          },
          method: "GET"
        });
        return await response.json();
      }
}

export const displayService = new DisplayService();