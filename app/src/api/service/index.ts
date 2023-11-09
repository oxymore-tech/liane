import {
  AppLogger,
  AuthService,
  AuthServiceClient,
  HttpClient,
  HubService,
  LianeService,
  LianeServiceClient,
  NotificationService,
  NotificationServiceClient,
  RallyingPointClient,
  RallyingPointService,
  RoutingService,
  RoutingServiceClient,
  HubServiceClient,
  LocationService,
  DEFAULT_TLS
} from "@liane/common";
import { RNAppEnv } from "@/api/env";
import { ReactNativeStorage } from "@/api/storage";
import { ReactNativeLogger } from "@/api/logger";
import { ReminderService } from "@/api/service/reminder";
import { ReactNativeLocationService } from "@/api/service/location";

export type AppServices = {
  auth: AuthService;
  liane: LianeService;
  rallyingPoint: RallyingPointService;
  realTimeHub: HubService;
  location: LocationService;
  routing: RoutingService;
  notification: NotificationService;
  reminder: ReminderService;
};

const storage = new ReactNativeStorage();
const logger = new ReactNativeLogger();

const http = new HttpClient(RNAppEnv.baseUrl, logger as AppLogger, storage);

export const CreateAppServices = (): AppServices => ({
  auth: new AuthServiceClient(http, storage),
  liane: new LianeServiceClient(http),
  reminder: new ReminderService(storage),
  rallyingPoint: new RallyingPointClient(http),
  realTimeHub: new HubServiceClient(RNAppEnv, logger as AppLogger, storage, http),
  location: new ReactNativeLocationService(RNAppEnv, storage, DEFAULT_TLS),
  routing: new RoutingServiceClient(http),
  notification: new NotificationServiceClient(http)
});
