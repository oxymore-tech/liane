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
  NewMember,
  PaginatedResponse
} from "@/api";
import { get, postAs } from "@/api/http";

export interface LianeService {
  list(): Promise<PaginatedResponse<Liane>>;
  post(liane: LianeRequest): Promise<Liane>;
  match(filter: LianeSearchFilter): Promise<PaginatedResponse<LianeMatch>>;
  display(from: LatLng, to: LatLng): Promise<LianeDisplay>;
  join(joinRequest: JoinRequest): Promise<JoinRequest>;
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed>;
  answer(joinRequestId: string, accept: boolean, joinRequest: JoinRequest): Promise<void>;
  get(lianeId: string): Promise<Liane>;
  listJoinRequests(): Promise<PaginatedResponse<JoinLianeRequestDetailed>>;
}

export class LianeServiceClient implements LianeService {
  list() {
    return get<PaginatedResponse<Liane>>("/liane/");
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

  async answer(joinRequestId: string, accept: boolean, joinRequest: JoinRequest) {
    let lianeEvent: LianeEvent;
    if (accept) {
      lianeEvent = <NewMember>{ ...joinRequest, type: "NewMember" };
    } else {
      lianeEvent = <MemberRejected>{ type: "MemberRejected", liane: joinRequest.liane };
    }
    await postAs("/event/" + joinRequestId, { body: lianeEvent });
  }
}
