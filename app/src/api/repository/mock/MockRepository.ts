import { MockAuthRepository } from "@/api/repository/mock/auth";
import { MockLianeRepository } from "@/api/repository/mock/liane";
import { IAppRepository } from "@/App";

export const MockRepository = (): IAppRepository => ({
  auth: new MockAuthRepository(),
  liane: new MockLianeRepository()
});