import { SubscriptionLike } from "rxjs";
import { Linking, PermissionsAndroid, Platform, PlatformAndroidStatic } from "react-native";
import { HttpClient, WayPoint, getTotalDuration } from "@liane/common";
import { RNAppEnv } from "@/api/env";
import { AppLogger } from "@/api/logger";
import { AppStorage } from "@/api/storage";
import { check, PERMISSIONS, request } from "react-native-permissions";
import { GeolocationPermission, LianeGeolocation } from "./index";
import { inviteToOpenSettings, RNLianeGeolocation, running } from "./common";

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

  constructor(private httpClient: HttpClient) {}

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

  stopSendingPings = async () => {
    await this.AndroidNativeModule.stopService();
    return running.next(undefined);
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

  async checkGeolocationPermission(): Promise<GeolocationPermission> {
    const background = await check(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
    const appInUse = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

    if (background === "granted") {
      AppLogger.info("GEOPINGS", `Location ping permission BACKGROUND`);
      return GeolocationPermission.Background;
    }

    if (appInUse === "granted") {
      AppLogger.info("GEOPINGS", `Location ping permission APP_IN_USE`);
      return GeolocationPermission.AppInUse;
    }

    AppLogger.info("GEOPINGS", `Location ping permission DENIED`);
    return GeolocationPermission.Denied;
  }

  async requestBackgroundGeolocationPermission() {
    if (this.Platform.Version <= 29) {
      const status = await request(
        this.Platform.Version === 29 ? PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      );
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
