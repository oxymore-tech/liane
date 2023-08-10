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
  Ref
} from "@/api";
import { get, postAs, del, patch } from "@/api/http";
import { JoinRequest, MemberPing } from "@/api/event";
import { TimeInSeconds } from "@/util/datetime";
import { retrieveAsync, storeAsync } from "@/api/storage";
import { cancelReminder, createReminder } from "@/api/service/notification";
import { sync } from "@/util/store";

export interface LianeService {
  list(current?: boolean, cursor?: string, pageSize?: number): Promise<PaginatedResponse<Liane>>;
  post(liane: LianeRequest): Promise<Liane>;
  match2(filter: LianeSearchFilter): Promise<LianeMatchDisplay>;
  pickupLinks(pickup: Ref<RallyingPoint>, lianes: Ref<Liane>[]): Promise<NearestLinks>;
  join(joinRequest: JoinRequest): Promise<JoinRequest>;
  leave(id: string, userId: string): Promise<void>;
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed>;
  get(lianeId: string): Promise<Liane>;
  listJoinRequests(): Promise<PaginatedResponse<JoinLianeRequestDetailed>>;
  delete(lianeId: string): Promise<void>;
  deleteJoinRequest(id: string): Promise<void>;
  updateDepartureTime(id: string, departureTime: UTCDateTime): Promise<void>;
  updateFeedback(id: string, feedback: Feedback): Promise<void>;
  getContact(id: string, memberId: string): Promise<string>;
  warnDelay(id: Ref<Liane>, delay: TimeInSeconds): Promise<void>;
  cancel(id: string): Promise<void>;
}
export class LianeServiceClient implements LianeService {
  async warnDelay(id: string, delay: number): Promise<void> {
    const ping: MemberPing = {
      type: "MemberPing",
      liane: id,
      timestamp: new Date().getTime(),
      delay
    };
    await postAs(`/event/member_ping`, { body: ping }).catch(e => console.warn(e));
  }
  async delete(lianeId: string): Promise<void> {
    await del(`/liane/${lianeId}`);
  }
  async list(current: boolean = true, cursor: string | undefined = undefined, pageSize: number = 10) {
    let paramString = current ? "?state=NotStarted&state=Started&state=Finished" : "?state=Archived&state=Canceled";
    //TODO cursor
    const lianes = await get<PaginatedResponse<Liane>>("/liane" + paramString);
    //console.debug(JSON.stringify(lianes));
    this.syncWithStorage(lianes.data);
    return lianes;
  }

  listJoinRequests() {
    return get<PaginatedResponse<JoinLianeRequestDetailed>>("/event/join_request/");
  }

  get(id: string) {
    return get<Liane>(`/liane/${id}`);
  }

  post(liane: LianeRequest) {
    return postAs<Liane>("/liane/", { body: liane });
  }

  async cancel(lianeId: string) {
    await postAs(`/liane/${lianeId}/cancel`);
  }
  pickupLinks(pickup: Ref<RallyingPoint>, lianes: Ref<Liane>[]): Promise<NearestLinks> {
    const body = { pickup, lianes };
    return postAs("/liane/links", { body });
  }

  join(joinRequest: JoinRequest) {
    return postAs<JoinRequest>(`/event/join_request`, { body: joinRequest }); // TODO now returns nothing ?
  }

  async leave(id: string, userId: string) {
    await del(`/liane/${id}/members/${userId}`);
  }
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed> {
    return get<JoinLianeRequestDetailed>("/event/join_request/" + joinRequestId);
  }
  getContact(id: string, memberId: string): Promise<string> {
    return get<string>(`/liane/${id}/members/${memberId}/contact`);
  }

  async deleteJoinRequest(id: string): Promise<void> {
    await del(`/event/join_request/${id}`);
  }

  async updateDepartureTime(id: string, departureTime: UTCDateTime): Promise<void> {
    await patch(`/liane/${id}`, { body: departureTime });
  }

  async updateFeedback(id: string, feedback: Feedback): Promise<void> {
    await postAs(`/liane/${id}/feedback`, { body: feedback });
  }
  match2(filter: LianeSearchFilter): Promise<LianeMatchDisplay> {
    return postAs<LianeMatchDisplay>("/liane/match/geojson", { body: filter });
  }

  private async syncWithStorage(lianes: Liane[]) {
    let local = (await retrieveAsync<LocalLianeData[]>("lianes")) || [];
    const now = new Date().getTime() + 1000 * 60 * 5;
    local = local.filter(l => new Date(l.departureTime).getTime() > now);
    const online = [...lianes].filter(l => l.members.length > 1 && l.driver.canDrive && new Date(l.departureTime).getTime() > now);

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
