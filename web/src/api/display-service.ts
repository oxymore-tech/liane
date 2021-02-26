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

      async SearchTrips(departure : RallyingPoint, arrival : RallyingPoint, day : number, hour1 : number, hour2 : number): Promise<Trip[]> {
        const url = new URL("/api/display/searchtrip", BaseUrl);
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST", body: JSON.stringify({
            departure,
            arrival,
            day,
            hour1,
            hour2,
          })
        });
        return Object.values(await response.json());
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

      async NotifyDriver(user: string , name: string , number: string ): Promise<void> {
        const url = new URL("/api/display/notify", BaseUrl);
        url.searchParams.append("user", user.toString());
        url.searchParams.append("name", name.toString());
        url.searchParams.append("number", number.toString());
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        });
        return await response.json();
      }
}

export const displayService = new DisplayService();