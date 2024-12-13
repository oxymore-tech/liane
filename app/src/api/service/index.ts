import {
  AuthService,
  AuthServiceClient,
  HttpClient,
  HubService,
  TripService,
  TripServiceClient,
  CommunityServiceClient,
  RallyingPointClient,
  RallyingPointService,
  RoutingService,
  RoutingServiceClient,
  HubServiceClient,
  LocationService,
  CommunityService,
  DEFAULT_TLS,
  AppLogger
} from "@liane/common";
import { RNAppEnv } from "@/api/env";
import { AppStorage } from "@/api/storage";
import { ReactNativeLocationService } from "@/api/service/location";
import { AppLogger as logger, ReactNativeLogger } from "@/api/logger";

export type AppServices = {
  logger: ReactNativeLogger;
  auth: AuthService;
  trip: TripService;
  rallyingPoint: RallyingPointService;
  realTimeHub: HubService;
  location: LocationService;
  routing: RoutingService;
  community: CommunityService;
};

const http = new HttpClient(RNAppEnv.baseUrl, logger as AppLogger, AppStorage);

export const CreateAppServices = (): AppServices => ({
  logger,
  auth: new AuthServiceClient(http, AppStorage),
  trip: new TripServiceClient(http),
  rallyingPoint: new RallyingPointClient(http),
  realTimeHub: new HubServiceClient(RNAppEnv.baseUrl, logger as AppLogger, AppStorage, http),
  location: new ReactNativeLocationService(RNAppEnv, AppStorage, http, DEFAULT_TLS),
  routing: new RoutingServiceClient(http),
  community: new CommunityServiceClient(http)
});
