import {
  JoinLianeRequestDetailed,
  Liane,
  LianeRequest,
  LianeSearchFilter,
  PaginatedResponse,
  UTCDateTime,
  LianeMatchDisplay,
  NearestLinks,
  Feedback,
  RallyingPoint,
  Ref,
  LianeUpdate,
  DayOfTheWeekFlag,
  LianeRecurrence,
  LianeState
} from "@/api";
import { get, postAs, del, patch } from "@/api/http";
import { JoinRequest, MemberPing } from "@/api/event";
import { TimeInSeconds } from "@/util/datetime";
import { getCurrentUser, retrieveAsync, storeAsync } from "@/api/storage";
import { cancelReminder, createReminder } from "@/api/service/notification";
import { sync } from "@/util/store";
import { getTripFromLiane } from "@/components/trip/trip";

export interface LianeService {
  get(lianeId: string): Promise<Liane>;
  list(states: LianeState[], cursor?: string, pageSize?: number): Promise<PaginatedResponse<Liane>>;
  post(liane: LianeRequest): Promise<Liane>;
  join(joinRequest: JoinRequest): Promise<JoinRequest>;
  match2(filter: LianeSearchFilter): Promise<LianeMatchDisplay>;
  pickupLinks(pickup: Ref<RallyingPoint>, lianes: Ref<Liane>[]): Promise<NearestLinks>;
  listJoinRequests(): Promise<PaginatedResponse<JoinLianeRequestDetailed>>;
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed>;
  getContact(id: string, memberId: string): Promise<string>;
  getRecurrence(id: string): Promise<LianeRecurrence>;

  addRecurrence(lianeId: string, recurrence: DayOfTheWeekFlag): Promise<void>;
  updateDepartureTime(id: string, departureTime: string): Promise<void>;
  updateRecurrence(id: string, recurrence: DayOfTheWeekFlag): Promise<void>;
  updateFeedback(id: string, feedback: Feedback): Promise<void>;
  warnDelay(id: Ref<Liane>, delay: TimeInSeconds): Promise<void>;
  pause(id: string): Promise<void>;
  unpause(id: string): Promise<void>;
  cancel(id: string): Promise<void>;

  leave(id: string, userId: string): Promise<void>;
  delete(lianeId: string): Promise<void>;
  deleteJoinRequest(id: string): Promise<void>;
  deleteRecurrence(id: string): Promise<void>;
}
export class LianeServiceClient implements LianeService {
  // GET
  async get(id: string): Promise<Liane> {
    return await get<Liane>(`/liane/${id}`);
  }

  async list(states: LianeState[] = ["NotStarted", "Started"], cursor: string | undefined = undefined, pageSize: number = 10) {
    let paramString = states.map((state: string, index: number) => `${index === 0 ? "?" : "&"}state=${state}`).join("");
    //TODO cursor
    const lianes = await get<PaginatedResponse<Liane>>("/liane" + paramString);
    this.syncWithStorage(lianes.data);
    return lianes;
  }

  async post(liane: LianeRequest): Promise<Liane> {
    return await postAs<Liane>("/liane/", { body: liane });
  }

  async join(joinRequest: JoinRequest): Promise<JoinRequest> {
    return await postAs<JoinRequest>(`/event/join_request`, { body: joinRequest }); // TODO now returns nothing ?
  }

  async match2(filter: LianeSearchFilter): Promise<LianeMatchDisplay> {
    return await postAs<LianeMatchDisplay>("/liane/match/geojson", { body: filter });
  }

  async pickupLinks(pickup: Ref<RallyingPoint>, lianes: Ref<Liane>[]): Promise<NearestLinks> {
    const body = { pickup, lianes };
    return await postAs("/liane/links", { body });
  }

  async listJoinRequests(): Promise<PaginatedResponse<JoinLianeRequestDetailed>> {
    return await get<PaginatedResponse<JoinLianeRequestDetailed>>("/event/join_request/");
  }

  async getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed> {
    return await get<JoinLianeRequestDetailed>("/event/join_request/" + joinRequestId);
  }

  async getContact(id: string, memberId: string): Promise<string> {
    return await get<string>(`/liane/${id}/members/${memberId}/contact`);
  }

  async getRecurrence(id: string): Promise<LianeRecurrence> {
    return await get<LianeRecurrence>(`/liane/recurrence/${id}`);
  }

  // PATCH
  async addRecurrence(lianeId: string, recurrence: DayOfTheWeekFlag): Promise<void> {
    console.log("TODO: ADD RECURRENCE TO ALREADY CREATE LIANE ROUTE", lianeId, recurrence);
  }

  async updateDepartureTime(id: string, departureTime: string): Promise<void> {
    await patch(`/liane/${id}`, { body: <LianeUpdate>{ departureTime } });
  }

  async updateRecurrence(id: string, recurrence: DayOfTheWeekFlag): Promise<void> {
    await patch(`/liane/recurrence/${id}`, { body: recurrence });
  }

  async updateFeedback(id: string, feedback: Feedback): Promise<void> {
    await postAs(`/liane/${id}/feedback`, { body: feedback });
  }

  async warnDelay(id: string, delay: number): Promise<void> {
    const ping: MemberPing = {
      type: "MemberPing",
      liane: id,
      timestamp: new Date().getTime(),
      delay
    };
    await postAs(`/event/member_ping`, { body: ping }).catch(e => console.warn(e));
  }

  async pause(id: string): Promise<void> {
    console.log("TODO: PAUSE LIANE ROUTE", id);
  }

  async unpause(id: string): Promise<void> {
    console.log("TODO: UNPAUSE LIANE ROUTE", id);
  }

  async delete(lianeId: string): Promise<void> {
    await del(`/liane/${lianeId}`);
  }

  async leave(id: string, userId: string) {
    await del(`/liane/${id}/members/${userId}`);
  }

  async deleteJoinRequest(id: string): Promise<void> {
    await del(`/event/join_request/${id}`);
  }

  async cancel(lianeId: string): Promise<void> {
    await postAs(`/liane/${lianeId}/cancel`);
  }

  async deleteRecurrence(id: string): Promise<void> {
    await del(`/liane/recurrence/${id}`);
  }

  private async syncWithStorage(lianes: Liane[]): Promise<void> {
    let local = (await retrieveAsync<LocalLianeData[]>("lianes")) || [];
    const now = new Date().getTime() + 1000 * 60 * 5;
    const user = await getCurrentUser();
    local = local.filter(l => new Date(l.departureTime).getTime() > now);
    const online = lianes
      .map(l => ({ ...l, departureTime: getTripFromLiane(l, user!).departureTime }))
      .filter(l => l.members.length > 1 && l.driver.canDrive && new Date(l.departureTime).getTime() > now);

    const { added, removed, stored } = sync(
      online,
      local,
      liane => ({ lianeId: liane.id!, departureTime: liane.departureTime }),
      l => l.id!,
      d => d.lianeId,
      (l, d) => l.departureTime !== d.departureTime
    );
    for (let r of removed) {
      await cancelReminder(r.lianeId);
    }
    for (let liane of added) {
      await createReminder(liane.id!, liane.wayPoints[0].rallyingPoint, new Date(liane.departureTime));
    }

    await storeAsync("lianes", stored);
  }
}

export type LocalLianeData = {
  lianeId: string;
  departureTime: UTCDateTime;
};
