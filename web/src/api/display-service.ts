import { post, postAs } from "@/api/http";
import { DayOfWeek, RallyingPoint, RouteStat, Trip } from ".";

class DisplayService {

  async search(day?: DayOfWeek, from?: RallyingPoint, to?: RallyingPoint, startHour?: number, endHour?: number): Promise<Trip[]> {
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

  listStepsFrom(trips: Trip[]): Promise<RallyingPoint[]> {
    return postAs("/api/step", { body: trips });
  }

  async getRoutes(trips: Trip[], day: DayOfWeek, startHour?: number, endHour?: number): Promise<RouteStat[]> {
    const routes = await postAs<{ [key:string]: RouteStat }>("/api/route", { params: { day, startHour, endHour }, body: trips });
    return Object.values(routes);
  }

  async notifyDriver(user: string, name: string, number: string): Promise<void> {
    await post("/api/notification", { params: { user, name, number } });
  }

}

export const displayService = new DisplayService();