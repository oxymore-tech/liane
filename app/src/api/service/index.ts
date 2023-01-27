import { AuthService, AuthServiceClient } from "@/api/service/auth";
import { LianeService, LianeServiceClient } from "@/api/service/liane";
import { RallyingPointClient } from "@/api/service/rallyingPoints";

export type AppServices = {
  auth: AuthService;
  liane: LianeService;
  rallyingPoint: RallyingPointClient;
};

export const CreateAppServices = (): AppServices => ({
  auth: new AuthServiceClient(),
  liane: new LianeServiceClient(),
  rallyingPoint: new RallyingPointClient()
});
