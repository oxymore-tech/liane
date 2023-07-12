import { AuthService, AuthServiceClient } from "@/api/service/auth";
import { LianeService, LianeServiceClient } from "@/api/service/liane";
import { RallyingPointClient, RallyingPointService } from "@/api/service/rallyingPoints";
import { HubServiceClient } from "@/api/service/chat";
import { LocationService, LocationServiceClient } from "@/api/service/location";
import { NotificationServiceClient } from "@/api/service/notification";
import { RoutingService, RoutingServiceClient } from "@/api/service/routing";
import { ChatHubService } from "@/api/service/interfaces/hub";
import { NotificationService } from "@/api/service/interfaces/notification";

export type AppServices = {
  readonly auth: AuthService;
  readonly liane: LianeService;
  readonly rallyingPoint: RallyingPointService;
  readonly chatHub: ChatHubService;
  readonly location: LocationService;

  readonly routing: RoutingService;
  readonly notification: NotificationService;
};

export const CreateAppServices = (): AppServices => ({
  auth: new AuthServiceClient(),
  liane: new LianeServiceClient(),
  rallyingPoint: new RallyingPointClient(),
  chatHub: new HubServiceClient(),
  location: new LocationServiceClient(),
  routing: new RoutingServiceClient(),
  notification: new NotificationServiceClient()
});
