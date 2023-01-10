import { APIAuthRepository } from "@/api/repository/auth";
import { APILianeRepository } from "@/api/repository/liane";
import { IAppRepository } from "@/App";

export const AppRepository = (): IAppRepository => ({
  auth: new APIAuthRepository(),
  liane: new APILianeRepository()
});