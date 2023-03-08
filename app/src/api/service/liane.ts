import { JoinLianeRequest, JoinLianeRequestDetailed, Liane, LianeMatch, LianeRequest, LianeSearchFilter, PaginatedResponse } from "@/api";
import { get, patch, postAs } from "@/api/http";

export interface LianeService {
  list(): Promise<PaginatedResponse<Liane>>;
  post(liane: LianeRequest): Promise<Liane>;
  match(filter: LianeSearchFilter): Promise<PaginatedResponse<LianeMatch>>;
  join(joinRequest: JoinLianeRequest): Promise<JoinLianeRequest>;
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed>;
  setAcceptedStatus(joinRequestId: string, accept: boolean): Promise<void>;
  get(lianeId: string): Promise<Liane>;
  listJoinRequests(): Promise<PaginatedResponse<JoinLianeRequestDetailed>>;
}

export class LianeServiceClient implements LianeService {
  list = async (): Promise<PaginatedResponse<Liane>> => get("/liane/");
  listJoinRequests = async (): Promise<PaginatedResponse<JoinLianeRequestDetailed>> => get("/liane/request/");
  get = async (id: string): Promise<Liane> => get("/liane/" + id);
  post = async (liane: LianeRequest): Promise<Liane> => {
    return postAs<Liane>("/liane/", { body: liane });
  };
  match = async (filter: LianeSearchFilter): Promise<PaginatedResponse<LianeMatch>> => {
    return postAs<PaginatedResponse<LianeMatch>>("/liane/match", { body: filter });
  };
  join = async (joinRequest: JoinLianeRequest): Promise<JoinLianeRequest> => {
    return postAs<JoinLianeRequest>(`/liane/${joinRequest.targetLiane}/request`, { body: joinRequest });
  };
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed> {
    return get("/liane/request/" + joinRequestId);
  }
  async setAcceptedStatus(joinRequestId: string, accept: boolean): Promise<void> {
    await patch("/liane/request/" + joinRequestId, { params: { accept: accept ? 1 : 0 } });
  }
}
