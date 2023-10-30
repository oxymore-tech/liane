import {
  AppLogger,
  AppStorage,
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
import { AppEnv } from "@/api/env";
import { ReactNativeStorage } from "@/api/storage";
import { ReactNativeLogger } from "@/api/logger";
import { ReminderService } from "@/api/service/reminder";
import { ReactNativeLocationService } from "@/api/service/location";

export type AppServices = {
  logger: ReactNativeLogger;

  storage: AppStorage;
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
const genericLogger = logger as AppLogger;

const http = new HttpClient(AppEnv, genericLogger, storage);

export const CreateAppServices = (): AppServices => ({
  storage,
  logger,
  auth: new AuthServiceClient(http),
  liane: new LianeServiceClient(http),
  reminder: new ReminderService(storage),
  rallyingPoint: new RallyingPointClient(http),
  realTimeHub: new HubServiceClient(AppEnv, genericLogger, storage, http),
  location: new ReactNativeLocationService(AppEnv, storage, DEFAULT_TLS),
  routing: new RoutingServiceClient(http),
  notification: new NotificationServiceClient(http)
});
