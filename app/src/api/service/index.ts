import {
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
  DEFAULT_TLS,
  AppLogger
} from "@liane/common";
import { RNAppEnv } from "@/api/env";
import { AppStorage } from "@/api/storage";
import { ReminderService } from "@/api/service/reminder";
import { ReactNativeLocationService } from "@/api/service/location";
import { AppLogger as logger, ReactNativeLogger } from "@/api/logger";

export type AppServices = {
  logger: ReactNativeLogger;
  auth: AuthService;
  liane: LianeService;
  rallyingPoint: RallyingPointService;
  realTimeHub: HubService;
  location: LocationService;
  routing: RoutingService;
  notification: NotificationService;
  reminder: ReminderService;
};

const http = new HttpClient(RNAppEnv.baseUrl, logger as AppLogger, AppStorage);

export const CreateAppServices = (): AppServices => ({
  logger,
  auth: new AuthServiceClient(http, AppStorage),
  liane: new LianeServiceClient(http),
  reminder: new ReminderService(AppStorage, logger),
  rallyingPoint: new RallyingPointClient(http),
  realTimeHub: new HubServiceClient(RNAppEnv.baseUrl, logger as AppLogger, AppStorage, http),
  location: new ReactNativeLocationService(RNAppEnv, AppStorage, DEFAULT_TLS),
  routing: new RoutingServiceClient(http),
  notification: new NotificationServiceClient(http)
});
