import { AuthService, AuthServiceClient } from "@/api/service/auth";
import { LianeService, LianeServiceClient } from "@/api/service/liane";

export type AppServices = {
  auth: AuthService;
  liane: LianeService;
};

export const CreateAppServices = (): AppServices => ({
  auth: new AuthServiceClient(),
  liane: new LianeServiceClient()
});