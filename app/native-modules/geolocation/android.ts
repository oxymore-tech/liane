import { SubscriptionLike } from "rxjs";
import { Linking, PermissionsAndroid, Platform, PlatformAndroidStatic } from "react-native";
import { HttpClient, WayPoint } from "@liane/common";
import { RNAppEnv } from "@/api/env";
import { AppLogger } from "@/api/logger";
import { AppStorage } from "@/api/storage";
import { check, PERMISSIONS, request } from "react-native-permissions";
import { LianeGeolocation } from "./index";
import { ALLOW_LOCATION, ENABLE_GPS, inviteToOpenSettings, RNLianeGeolocation, running } from "./common";
import { getTotalDuration } from "@/components/trip/trip.ts";

export const LocationAlert = {
  inviteToOpenSettings,
  messages: {
    ENABLE_GPS,
    ALLOW_LOCATION
  } as const
};

type BackgroundGeolocationServiceConfig = {
  pingConfig: { url: string; token: string; userId: string; lianeId: string };
  geolocationConfig?: {
    interval: number;
    nearWayPointRadius: number;
    nearWayPointInterval: number;
  };
  wayPoints: string;
  timeout: number;
};

export class AndroidService implements LianeGeolocation {
  private AndroidNativeModule = RNLianeGeolocation as {
    startService(config: BackgroundGeolocationServiceConfig): Promise<void>;
    stopService(): Promise<void>;
    enableLocation(): Promise<void>;
    current(): Promise<string | undefined>;
    watch(callback: (running: string | undefined) => void): SubscriptionLike;
  };
  private Platform = Platform as PlatformAndroidStatic;

  constructor(private httpClient: HttpClient) {
    console.log("AndroidService constructor");
    console.log("AndroidService constructor", this.AndroidNativeModule);
  }

  async startSendingPings(lianeId: string, wayPoints: WayPoint[]): Promise<void> {
    const user = await AppStorage.getUser();
    // Refresh token here to avoid issues
    const token = await this.httpClient.getUpdatedAccessToken(true);
    if (!token) {
      throw new Error("No access token");
    }
    const tripDuration = getTotalDuration(wayPoints);
    const timeout = (tripDuration + 3600) * 1000;

    const nativeConfig = {
      pingConfig: { lianeId, userId: user!.id!, token: token!, url: RNAppEnv.baseUrl },
      timeout,
      geolocationConfig: {
        interval: 90,
        nearWayPointInterval: 10,
        nearWayPointRadius: 2000
      },
      wayPoints: wayPoints
        .map(w => [w.rallyingPoint.location.lng, w.rallyingPoint.location.lat])
        .map(w => w.join(","))
        .join(";")
    };

    return this.AndroidNativeModule.startService(nativeConfig).then(() => running.next(nativeConfig.pingConfig.lianeId));
  }

  stopSendingPings = () => {
    return this.AndroidNativeModule.stopService().then(() => running.next(undefined));
  };
  requestEnableGPS = this.AndroidNativeModule.enableLocation;
  currentLiane = this.AndroidNativeModule.current;
  watchRunningService = (callback: (running: string | undefined) => void) => running.subscribe(callback);

  async checkAndRequestLocationPermission(): Promise<boolean> {
    if (this.Platform.Version < 23) {
      return true;
    }

    const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

    if (hasPermission) {
      return true;
    }

    const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

    if (status === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    if (status === PermissionsAndroid.RESULTS.DENIED) {
      AppLogger.debug("SETTINGS", "Location permission denied by user");
      inviteToOpenSettings();
    } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      AppLogger.debug("SETTINGS", "Location permission revoked by user");
      inviteToOpenSettings();
    }

    return false;
  }

  async checkBackgroundGeolocationPermission(): Promise<boolean> {
    const access = await check(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
    const accessAppInUse = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

    AppLogger.info("GEOPINGS", `Location ping permission background ${access}`);
    AppLogger.info("GEOPINGS", `Location ping permission AppInUse ${accessAppInUse}`);
    return access === "granted" || accessAppInUse === "granted";
  }

  async requestBackgroundGeolocationPermission() {
    if (this.Platform.Version <= 29) {
      const status = await request(
        this.Platform.Version === 29 ? PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      );
      //console.log(status);
      if (status === "granted") {
        return true;
      } else {
        inviteToOpenSettings();
      }
    } else {
      await Linking.openSettings().catch(() => {
        AppLogger.warn("SETTINGS", "Unable to open settings");
      });
    }
    return false;
  }
}
