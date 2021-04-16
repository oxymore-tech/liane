import { get, post, postAs } from "@api/http";
import { DayOfWeek, RallyingPoint, RouteStat, Trip } from ".";

class DisplayService {

  async SnapPosition(lat: number, lng: number): Promise<RallyingPoint[]> {
    return get("/api/snap", { params: { lat, lng } });
  }

  async Search(day?: DayOfWeek, from?: RallyingPoint, to?: RallyingPoint, startHour?: number, endHour?: number): Promise<Trip[]> {
    const body = {
      startHour,
      endHour,
      day,
      from,
      to
    };
    const data = await post("/api/trip", { body });
    return Object.values(data);
  }

  async ListDestinationsFrom(from: string): Promise<RallyingPoint[]> {
    return get("/api/rallyingPoint", { params: { from } });
  }

  ListStepsFrom(trips: Trip[]): Promise<RallyingPoint[]> {
    return postAs("/api/step", { body: trips });
  }

  async GetRoutes(trips: Trip[], day: DayOfWeek, startHour?: number, endHour?: number): Promise<RouteStat[]> {
    const routes = await postAs<{ [key:string]: RouteStat }>("/api/route", { params: { day, startHour, endHour }, body: trips });
    return Object.values(routes);
  }

  async NotifyDriver(user: string, name: string, number: string): Promise<void> {
    await post("/api/notification", { params: { user, name, number } });
  }

}

export const displayService = new DisplayService();