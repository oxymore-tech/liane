import { get, post, postAs } from "@api/http";
import { DayOfWeek, RallyingPoint, RouteStat, Trip } from ".";

class DisplayService {

  async SnapPosition(lat: number, lng: number): Promise<RallyingPoint[]> {
    return get("/api/display/snap", { params: { lat, lng } });
  }

  async SearchTrips(day? : DayOfWeek, start? : RallyingPoint, end? : RallyingPoint, from? : number, to? : number): Promise<Trip[]> {
    const body = {
      start,
      end,
      day,
      from,
      to
    };
    const data = await post("/api/display/trip", { body });
    return Object.values(data);
  }

  async ListDestinationsFrom(id: string, lat: number, lng: number): Promise<RallyingPoint[]> {
    return get("/api/display/destination", { params: { id, lat, lng } });
  }

  ListTripsFrom(id: string, lat: number, lng: number): Promise<Trip[]> {
    return get("/api/display/trip", { params: { id, lat, lng } });
  }

  ListStepsFrom(trips: Trip[]): Promise<RallyingPoint[]> {
    return postAs("/api/display/step", { body: trips });
  }

  async ListRoutesEdgesFrom(trips: Trip[], day: DayOfWeek, from?: number, to?: number): Promise<RouteStat[]> {
    return postAs("/api/display/edge", { params: { day, from, to }, body: trips });
  }

  async NotifyDriver(user: string, name: string, number: string): Promise<void> {
    await post("/api/notification", { params: { user, name, number } });
  }

  async ListTripsUser(user : string, day : string = null) : Promise<RallyingPoint[]> {
    return get("/api/display/usertrips", { params: { user, day } });
  }

}

export const displayService = new DisplayService();