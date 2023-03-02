import { AuthService, AuthServiceClient } from "@/api/service/auth";
import { LianeService, LianeServiceClient } from "@/api/service/liane";
import { RallyingPointClient, RallyingPointService } from "@/api/service/rallyingPoints";
import { ChatHubService, HubServiceClient } from "@/api/service/chat";
import { LocationService, LocationServiceClient } from "@/api/service/location";
import { NotificationService, NotificationServiceClient } from "@/api/service/notification";

export type AppServices = {
  readonly auth: AuthService;
  readonly liane: LianeService;
  readonly rallyingPoint: RallyingPointService;
  readonly chatHub: ChatHubService;
  readonly location: LocationService;

  readonly notification: NotificationService;
};

export const CreateAppServices = (): AppServices => ({
  auth: new AuthServiceClient(),
  liane: new LianeServiceClient(),
  rallyingPoint: new RallyingPointClient(),
  chatHub: new HubServiceClient(),
  location: new LocationServiceClient(),
  notification: new NotificationServiceClient()
});
