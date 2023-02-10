import { AuthService, AuthServiceClient } from "@/api/service/auth";
import { LianeService, LianeServiceClient } from "@/api/service/liane";
import { RallyingPointClient } from "@/api/service/rallyingPoints";
import { HubServiceClient } from "@/api/service/chat";

export type AppServices = {
  readonly auth: AuthService;
  readonly liane: LianeService;
  readonly rallyingPoint: RallyingPointClient;
  readonly chatHub: HubServiceClient;
};

export const CreateAppServices = (): AppServices => ({
  auth: new AuthServiceClient(),
  liane: new LianeServiceClient(),
  rallyingPoint: new RallyingPointClient(),
  chatHub: new HubServiceClient()
});
