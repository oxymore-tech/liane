import {
  Alert,
  Linking,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  PlatformAndroidStatic,
  PlatformIOSStatic
} from "react-native";
import { Subject, SubscriptionLike } from "rxjs";
import { AppLogger } from "@/api/logger";
import { check, PERMISSIONS, request } from "react-native-permissions";
import { MemberPing } from "@/api/event";
import { BaseUrl, postAs, tryRefreshToken } from "@/api/http";
import { isResourceNotFound, isValidationError } from "@/api/exception";
import { distance } from "@/util/geometry";
import { sleep } from "@/util/datetime";
import { UTCDateTime, WayPoint } from "@/api";
import { getAccessToken, getCurrentUser, retrieveAsync, storeAsync } from "@/api/storage";
import DeviceInfo from "react-native-device-info";

const { RNLianeGeolocation } = NativeModules;

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

export interface LianeGeolocation {
  startSendingPings(lianeId: string, wayPoints: WayPoint[]): Promise<void>;
  stopSendingPings(): Promise<void>;
  requestEnableGPS(): Promise<void>;
  isRunningService(lianeId: string): Promise<boolean>;
  watchRunningService(callback: (running: string | undefined) => void): SubscriptionLike;
  checkAndRequestLocationPermission(): Promise<boolean>;
  requestBackgroundGeolocationPermission(): Promise<boolean>;
  checkBackgroundGeolocationPermission(): Promise<boolean>;
}

const running = new Subject<string | undefined>();

interface GeoWatchOptions {
  useSignificantChanges?: boolean;
  showsBackgroundLocationIndicator?: boolean;
  pauseUpdatesAutomatically?: boolean;
  accuracy?: "bestForNavigation" | "best" | "nearestTenMeters" | "hundredMeters" | "kilometer" | "threeKilometers" | "reduced";
  enableHighAccuracy?: boolean;
  distanceFilter?: number;
}
enum PositionError {
  PERMISSION_DENIED = 1,
  POSITION_UNAVAILABLE = 2,
  TIMEOUT = 3
}

interface GeoError {
  code: PositionError;
  message: string;
}

interface GeoPosition {
  latitude: number;
  longitude: number;
  horizontalAccuracy: number;
  altitude: number | null;
  verticalAccuracy: number | null;
  course: number | null;
  speed: number | null;
  timestamp: number;
}

const ENABLE_GPS = `Activez le GPS pour permettre à Liane d'utiliser votre position.`;
const ALLOW_LOCATION = `L'accès à votre position est désactivé dans les paramètres. Certaines fonctionnalités risquent d'être limitées`;
const inviteToOpenSettings = (message?: string) => {
  const openSetting = () => {
    Linking.openSettings().catch(() => {
      AppLogger.warn("SETTINGS", "Unable to open settings");
    });
  };
  Alert.alert("Localisation désactivée", message ?? ALLOW_LOCATION, [
    { text: "Modifier les paramètres", onPress: openSetting },
    { text: "Ignorer", onPress: () => {} }
  ]);
};

export const LocationAlert = {
  inviteToOpenSettings,
  messages: {
    ENABLE_GPS,
    ALLOW_LOCATION
  } as const
};
class AndroidService implements LianeGeolocation {
  private AndroidNativeModule = RNLianeGeolocation as {
    startService(config: BackgroundGeolocationServiceConfig): Promise<void>;
    stopService(): Promise<void>;
    enableLocation(): Promise<void>;
    isRunning(lianeId: string): Promise<boolean>;
    watch(callback: (running: string | undefined) => void): SubscriptionLike;
  };
  private Platform = Platform as PlatformAndroidStatic;

  async startSendingPings(lianeId: string, wayPoints: WayPoint[]): Promise<void> {
    const user = await getCurrentUser();
    // Refresh token here to avoid issues
    await tryRefreshToken(() => Promise.resolve());
    const token = await getAccessToken();

    const tripDuration = new Date(wayPoints[wayPoints.length - 1].eta).getTime() - new Date().getTime();
    const timeout = tripDuration + 3600 * 1000;

    const nativeConfig = {
      pingConfig: { lianeId, userId: user!.id!, token: token!, url: BaseUrl },
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
  isRunningService = this.AndroidNativeModule.isRunning;
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
    const access = await check(
      this.Platform.Version >= 29 ? PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
    );
    AppLogger.info("GEOPINGS", `Location ping permission ${access}`);
    return access === "granted";
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

class IosService implements LianeGeolocation {
  private IosNativeModule = RNLianeGeolocation as {
    requestAuthorization(authorizationLevel: "always" | "whenInUse"): Promise<"disabled" | "granted" | "denied" | "restricted">;
    startObserving(options: GeoWatchOptions): void;
    stopObserving(): void;
  };
  private Platform = Platform as PlatformIOSStatic;
  private LocationEventEmitter = new NativeEventEmitter(RNLianeGeolocation);
  async startSendingPings(lianeId: string, wayPoints: WayPoint[]): Promise<void> {
    const tripDuration = new Date(wayPoints[wayPoints.length - 1].eta).getTime() - new Date().getTime();
    const timeout = tripDuration + 3600 * 1000;
    let preciseTrackingMode = true;
    AppLogger.debug("GEOPINGS", `tracking timeout = ${timeout} ms`);

    const onFailedCallback = (error: GeoError) => {
      AppLogger.error("GEOPINGS", "Failed to start geolocation for liane " + lianeId, error);
    };
    const getDistanceFilter = () => (preciseTrackingMode ? 10 : 500);
    const switchTrackingMode = async (precise: boolean) => {
      const r = await this.getCurrentGeolocationLianeId();
      if (!r) {
        await this.stopSendingPings();
        return;
      }
      preciseTrackingMode = precise;
      this.clearWatch();
      const accuracy = precise ? "best" : "nearestTenMeters";
      AppLogger.info("GEOPINGS", "Switched tracking mode to:", accuracy);
      this.watchPosition(onPositionCallback, onFailedCallback, { distanceFilter: getDistanceFilter(), accuracy, enableHighAccuracy: true });
    };

    const onPositionCallback = async (position: GeoPosition) => {
      // Send ping
      AppLogger.debug("GEOPINGS", "Position tracked", position);
      const coordinate = { lat: position.latitude, lng: position.longitude };
      const ping: MemberPing = {
        type: "MemberPing",
        liane: lianeId,
        coordinate,
        timestamp: Math.trunc(position.timestamp)
      };
      await postAs(`/event/member_ping`, { body: ping }).catch(err => {
        AppLogger.warn("GEOPINGS", "Could not send ping", err);
        if (isResourceNotFound(err) || isValidationError(err)) {
          AppLogger.info("GEOPINGS", "Stopping service :", err);
          stopTracking();
        }
      });
      const nearWayPointIndex = wayPoints.findIndex(w => distance(coordinate, w.rallyingPoint.location) <= 500);
      if (nearWayPointIndex > -1) {
        if (!preciseTrackingMode) {
          // Enable precise tracking
          await switchTrackingMode(true);
        } else if (nearWayPointIndex === wayPoints.length - 1) {
          AppLogger.info("GEOPINGS", "Reached destination. Tracking will stop in 1 minute.");
          sleep(60 * 1000).then(() => {
            AppLogger.info("GEOPINGS", "Stopping service : done");
            stopTracking();
          });
        }
      } else if (preciseTrackingMode) {
        // Disable precise tracking
        await switchTrackingMode(false);
      }
    };
    const stopTracking = () => {
      this.updateCurrentGeolocationLianeId(undefined);
      AppLogger.info("GEOPINGS", "Tracking stopped", lianeId);
      this.clearWatch();
    };

    this.updateCurrentGeolocationLianeId({ liane: lianeId, timeOutDate: new Date(new Date().getTime() + timeout).toISOString() });
    this.watchPosition(onPositionCallback, onFailedCallback, { distanceFilter: getDistanceFilter(), accuracy: "best", enableHighAccuracy: true });
  }
  async stopSendingPings() {
    this.updateCurrentGeolocationLianeId(undefined);
    this.clearWatch();
  }

  async checkAndRequestLocationPermission(): Promise<boolean> {
    const status = await this.requestAuthorization("whenInUse");

    if (status === "granted") {
      return true;
    } else if (status === "denied") {
      inviteToOpenSettings();
    } else if (status === "disabled") {
      inviteToOpenSettings(ENABLE_GPS);
    } else if (status === "restricted") {
      Alert.alert("Erreur : impossible d'activer la localisation");
    }

    return false;
  }

  async checkBackgroundGeolocationPermission(): Promise<boolean> {
    const access = await check(PERMISSIONS.IOS.LOCATION_ALWAYS);
    AppLogger.info("GEOPINGS", `Location ping permission ${access}`);
    return access === "granted";
  }

  async requestBackgroundGeolocationPermission(): Promise<boolean> {
    if (parseInt(this.Platform.Version, 10) < 13) {
      const status = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
      if (status === "granted") {
        return true;
      } else {
        inviteToOpenSettings();
      }
    } else {
      await Linking.openSettings();
    }
    return false;
  }
  private requestAuthorization = async (authorizationLevel: "always" | "whenInUse") => {
    return this.IosNativeModule.requestAuthorization(authorizationLevel);
  };

  private watchPosition = (
    success: (position: GeoPosition) => void,
    error: ((error: GeoError) => void) | null = null,
    options: GeoWatchOptions = {}
  ) => {
    this.LocationEventEmitter.addListener("geolocationDidChange", success);
    if (error) {
      this.LocationEventEmitter.addListener("geolocationError", error);
    }
    this.IosNativeModule.startObserving(options);
  };

  private clearWatch = () => {
    this.IosNativeModule.stopObserving();
    this.LocationEventEmitter.removeAllListeners("geolocationDidChange");
    this.LocationEventEmitter.removeAllListeners("geolocationError");
  };

  private getCurrentGeolocationLianeId = () => {
    return retrieveAsync<{ liane: string; timeOutDate: UTCDateTime } | undefined>("geolocation_lianeId");
  };

  private updateCurrentGeolocationLianeId = (val: { liane: string; timeOutDate: UTCDateTime } | undefined) => {
    storeAsync("geolocation_lianeId", val)
      .then(() => running.next(val?.liane))
      .catch(e => AppLogger.warn("GEOPINGS", "Could not persist liane id", e));
  };
  isRunningService = async (lianeId: string) => {
    const val = await this.getCurrentGeolocationLianeId();
    if (val && new Date() > new Date(val.timeOutDate)) {
      // Stop timed-out service
      await this.stopSendingPings();
    }
    return val?.liane === lianeId;
  };
  watchRunningService(callback: (running: string | undefined) => void): SubscriptionLike {
    return running.subscribe(callback);
  }
  async requestEnableGPS(): Promise<void> {
    const enabled = await DeviceInfo.isLocationEnabled();
    if (!enabled) {
      throw new Error("Location disabled");
    }
  }
}

export default (Platform.OS === "ios" ? new IosService() : new AndroidService()) as LianeGeolocation;
