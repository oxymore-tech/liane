import {
  JoinLianeRequest,
  JoinLianeRequestDetailed,
  LatLng,
  Liane,
  LianeDisplay,
  LianeMatch,
  LianeRequest,
  LianeSearchFilter,
  PaginatedResponse
} from "@/api";
import { get, patch, postAs } from "@/api/http";

export interface LianeService {
  list(): Promise<PaginatedResponse<Liane>>;
  post(liane: LianeRequest): Promise<Liane>;
  match(filter: LianeSearchFilter): Promise<PaginatedResponse<LianeMatch>>;
  display(from: LatLng, to: LatLng): Promise<LianeDisplay>;
  join(joinRequest: JoinLianeRequest): Promise<JoinLianeRequest>;
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed>;
  setAcceptedStatus(joinRequestId: string, accept: boolean): Promise<void>;
  get(lianeId: string): Promise<Liane>;
  listJoinRequests(): Promise<PaginatedResponse<JoinLianeRequestDetailed>>;
}

export class LianeServiceClient implements LianeService {
  list() {
    return get<PaginatedResponse<Liane>>("/liane/");
  }

  listJoinRequests() {
    return get<PaginatedResponse<JoinLianeRequestDetailed>>("/liane/request/");
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
    return get<LianeDisplay>("/liane/display", { params: { lat: from.lat, lng: from.lng, lat2: to.lat, lng2: to.lat } });
  }

  join(joinRequest: JoinLianeRequest) {
    return postAs<JoinLianeRequest>(`/liane/${joinRequest.targetLiane}/request`, { body: joinRequest });
  }

  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed> {
    return get<JoinLianeRequestDetailed>("/liane/request/" + joinRequestId);
  }

  async setAcceptedStatus(joinRequestId: string, accept: boolean) {
    await patch("/liane/request/" + joinRequestId, { params: { accept: accept ? 1 : 0 } });
  }
}
