import { LatLngExpression } from "leaflet";
import { LatLng, RallyingPoint, RouteStat, Trip } from ".";
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
        var data = await response.json();
        console.log("AFFICHE MOI LA REPONSE POUR LES TRIPS DANS ST: ", data);
        return Object.values(data);
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

      async ListRoutesEdgesFrom(trips: Trip[],
                                day : number,
                                hour1 : number = 0,
                                hour2 : number = 24): Promise<RouteStat[]> {
        const url = new URL("/api/display/listedges", BaseUrl);
        url.searchParams.append("day", day.toString());
        url.searchParams.append("hour1", hour1.toString());
        url.searchParams.append("hour2", hour2.toString());
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST", body: JSON.stringify(trips)
        });
        var data : RouteStat[] = Object.values(await response.json());
        console.log("DATA LRE ds.ts: ", data);
        return data;
      }

      async NotifyDriver(user: string , name: string , number: string ): Promise<void> {
        const url = new URL("/api/notification/notify", BaseUrl);
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

      async ListTripsUser(user : string, day : string = null) : Promise<RallyingPoint[]> {
        const url = new URL("/api/display/usertrips", BaseUrl);
        url.searchParams.append("user", user);
        url.searchParams.append("day", day);
        const response = await fetch(url.toString(), {
          method: "GET"
        });
        return await response.json();
      }
}

export const displayService = new DisplayService();