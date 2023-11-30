import { Platform } from "react-native";
import { SubscriptionLike } from "rxjs";
import { WayPoint } from "@liane/common";
import { IosService } from "./ios";
import { AndroidService } from "./android";

export interface LianeGeolocation {
  startSendingPings(lianeId: string, wayPoints: WayPoint[]): Promise<void>;
  stopSendingPings(): Promise<void>;
  requestEnableGPS(): Promise<void>;
  currentLiane(): Promise<string | undefined>;
  watchRunningService(callback: (running: string | undefined) => void): SubscriptionLike;
  checkAndRequestLocationPermission(): Promise<boolean>;
  requestBackgroundGeolocationPermission(): Promise<boolean>;
  checkBackgroundGeolocationPermission(): Promise<boolean>;
}

export default (Platform.OS === "ios" ? new IosService() : new AndroidService()) as LianeGeolocation;
