import {
  JoinLianeRequestDetailed,
  JoinRequest,
  LatLng,
  Liane,
  LianeDisplay,
  LianeEvent,
  LianeMatch,
  LianeRequest,
  LianeSearchFilter,
  MemberRejected,
  MemberAccepted,
  PaginatedResponse,
  NotificationPayload
} from "@/api";
import { get, postAs, del } from "@/api/http";

export interface LianeService {
  list(): Promise<PaginatedResponse<Liane>>;
  post(liane: LianeRequest): Promise<Liane>;
  match(filter: LianeSearchFilter): Promise<PaginatedResponse<LianeMatch>>;
  display(from: LatLng, to: LatLng): Promise<LianeDisplay>;
  join(joinRequest: JoinRequest): Promise<JoinRequest>;
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed>;
  answer(accept: boolean, event: NotificationPayload<JoinRequest>): Promise<void>;
  get(lianeId: string): Promise<Liane>;
  listJoinRequests(): Promise<PaginatedResponse<JoinLianeRequestDetailed>>;
  delete(lianeId: string): Promise<void>;
  deleteJoinRequest(id: string): Promise<void>;
}

export class LianeServiceClient implements LianeService {
  async delete(lianeId: string): Promise<void> {
    await del(`/liane/${lianeId}`);
  }
  async list() {
    const lianes = await get<PaginatedResponse<Liane>>("/liane/");
    console.debug(JSON.stringify(lianes));
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

  match(filter: LianeSearchFilter) {
    return postAs<PaginatedResponse<LianeMatch>>("/liane/match", { body: filter });
  }

  display(from: LatLng, to: LatLng) {
    return get<LianeDisplay>("/liane/display", { params: { lat: from.lat, lng: from.lng, lat2: to.lat, lng2: to.lng } });
  }

  join(joinRequest: JoinRequest) {
    return postAs<JoinRequest>(`/event`, { body: joinRequest });
  }

  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed> {
    return get<JoinLianeRequestDetailed>("/event/join_request/" + joinRequestId);
  }

  async answer(accept: boolean, event: NotificationPayload<JoinRequest>) {
    let lianeEvent: LianeEvent;
    if (accept) {
      lianeEvent = <MemberAccepted>{
        type: "MemberAccepted",
        liane: event.content.liane,
        member: event.createdBy.id,
        to: event.content.to,
        from: event.content.from,
        seats: event.content.seats,
        takeReturnTrip: event.content.takeReturnTrip
      };
    } else {
      lianeEvent = <MemberRejected>{ type: "MemberRejected", liane: event.content.liane, member: event.createdBy.id };
    }
    await postAs("/event/" + event.id!, { body: lianeEvent });
  }
  async deleteJoinRequest(id: string): Promise<void> {
    await del(`/event/join_request/${id}`);
  }
}
