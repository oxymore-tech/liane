import { DatetimeCursor, Liane, LianeMatch, LianeRequest, LianeSearchFilter, PaginatedResponse } from "@/api";
import { get, postAs } from "@/api/http";

export interface LianeService {
  list(): Promise<PaginatedResponse<Liane>>;
  post(liane: LianeRequest): Promise<Liane>;
  match(filter: LianeSearchFilter): Promise<PaginatedResponse<LianeMatch>>;
}

export class LianeServiceClient implements LianeService {
  list = async (): Promise<PaginatedResponse<Liane>> => get("/liane/");
  post = async (liane: LianeRequest): Promise<Liane> => postAs<Liane>("/liane/", { body: liane });
  match = async (filter: LianeSearchFilter): Promise<PaginatedResponse<LianeMatch>> => postAs("/liane/match", { body: filter });
}
