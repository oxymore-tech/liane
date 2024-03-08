import { Platform } from "react-native";
import { SubscriptionLike } from "rxjs";
import { HttpClient, WayPoint } from "@liane/common";
import { IosService } from "./ios";
import { AndroidService } from "./android";
import { RNAppEnv } from "@/api/env";
import { AppLogger } from "@/api/logger";
import { AppStorage } from "@/api/storage";

export enum GeolocationPermission {
  Denied,
  AppInUse,
  Background
}

export interface LianeGeolocation {
  startSendingPings(lianeId: string, wayPoints: WayPoint[]): Promise<void>;
  stopSendingPings(): Promise<void>;
  requestEnableGPS(): Promise<void>;
  currentLiane(): Promise<string | undefined>;
  watchRunningService(callback: (running: string | undefined) => void): SubscriptionLike;
  checkAndRequestLocationPermission(): Promise<boolean>;
  requestBackgroundGeolocationPermission(): Promise<boolean>;
  checkGeolocationPermission(): Promise<GeolocationPermission>;
}

const httpClient = new HttpClient(RNAppEnv.baseUrl, AppLogger as any, AppStorage);

export default (Platform.OS === "ios" ? new IosService(httpClient) : new AndroidService(httpClient)) as LianeGeolocation;
