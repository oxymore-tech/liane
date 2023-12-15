import { distance, HttpClient, isResourceNotFound, isValidationError, MemberPing, sleep, UTCDateTime, WayPoint } from "@liane/common";
import { RNAppEnv } from "@/api/env";
import { AppLogger } from "@/api/logger";
import { AppStorage } from "@/api/storage";
import { check, PERMISSIONS, request } from "react-native-permissions";
import { SubscriptionLike } from "rxjs";
import DeviceInfo from "react-native-device-info";
import { LianeGeolocation } from "./index";
import { Alert, Linking, NativeEventEmitter, Platform, PlatformIOSStatic } from "react-native";
import { ENABLE_GPS, inviteToOpenSettings, RNLianeGeolocation, running } from "./common";

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

function createBackgroundHttp(accessToken: string) {
  return new HttpClient(RNAppEnv.baseUrl, AppLogger as any, {
    closeSession: () => {
      return Promise.resolve();
    },
    getAccessToken: () => {
      return Promise.resolve(accessToken);
    },
    getRefreshToken: () => {
      return Promise.resolve(undefined);
    },
    getSession: () => {
      return Promise.resolve(undefined);
    },
    processAuthResponse: () => {
      throw new Error("not implemented");
    }
  });
}

export class IosService implements LianeGeolocation {
  private IosNativeModule = RNLianeGeolocation as {
    requestAuthorization(authorizationLevel: "always" | "whenInUse"): Promise<"disabled" | "granted" | "denied" | "restricted">;
    startObserving(options: GeoWatchOptions): void;
    stopObserving(): void;
  };
  private Platform = Platform as PlatformIOSStatic;
  private LocationEventEmitter = new NativeEventEmitter(RNLianeGeolocation);

  constructor(private httpClient: HttpClient) {}

  async startSendingPings(lianeId: string, wayPoints: WayPoint[]): Promise<void> {
    const accessToken = await this.httpClient.getUpdatedAccessToken(true);
    if (!accessToken) {
      throw new Error("No access token");
    }
    const http = createBackgroundHttp(accessToken);
    const tripDuration = new Date(wayPoints[wayPoints.length - 1].eta).getTime() - new Date().getTime();
    const timeout = tripDuration + 3600 * 1000;
    let preciseTrackingMode = true;
    AppLogger.debug("GEOPINGS", `tracking timeout = ${timeout} ms`);
    setTimeout(() => {
      AppLogger.info("GEOPINGS", "tracking service timed out");
      this.stopSendingPings();
    }, timeout);

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
      this.watchPosition(onPositionCallback, onFailedCallback, {
        distanceFilter: getDistanceFilter(),
        accuracy,
        enableHighAccuracy: true
      });
    };

    let repingTimeout: ReturnType<typeof setTimeout> | undefined;
    const postPing = async (ping: MemberPing, timestamp?: number) => {
      await http.postAs(`/event/member_ping`, { body: { ...ping, timestamp: timestamp || ping.timestamp } }).catch(err => {
        AppLogger.warn("GEOPINGS", "Could not send ping", err);
        if (isResourceNotFound(err) || isValidationError(err)) {
          AppLogger.info("GEOPINGS", "Stopping service :", err);
          stopTracking();
        }
      });

      // If no position update is received for a moment, keep sending this position
      // to have a homogeneous behavior with Android phones
      repingTimeout = setTimeout(() => {
        postPing(ping, new Date().getTime());
      }, 2 * 60 * 1000);
    };
    const onPositionCallback = async (position: GeoPosition) => {
      if (repingTimeout) {
        clearTimeout(repingTimeout);
      }
      // Send ping
      AppLogger.debug("GEOPINGS", "Position tracked", position);
      const coordinate = { lat: position.latitude, lng: position.longitude };
      const ping: MemberPing = {
        type: "MemberPing",
        liane: lianeId,
        coordinate,
        timestamp: Math.trunc(position.timestamp)
      };

      await postPing(ping);

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

    this.updateCurrentGeolocationLianeId({
      liane: lianeId,
      timeOutDate: new Date(new Date().getTime() + timeout).toISOString()
    });
    this.watchPosition(onPositionCallback, onFailedCallback, {
      distanceFilter: getDistanceFilter(),
      accuracy: "best",
      enableHighAccuracy: true
    });
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
    return AppStorage.retrieveAsync<{ liane: string; timeOutDate: UTCDateTime } | undefined>("geolocation_lianeId");
  };

  private updateCurrentGeolocationLianeId = (val: { liane: string; timeOutDate: UTCDateTime } | undefined) => {
    AppStorage.storeAsync("geolocation_lianeId", val)
      .then(() => running.next(val?.liane))
      .catch(e => AppLogger.warn("GEOPINGS", "Could not persist liane id", e));
  };
  currentLiane = async () => {
    const val = await this.getCurrentGeolocationLianeId();
    if (val && new Date() > new Date(val.timeOutDate)) {
      // Stop timed-out service
      await this.stopSendingPings();
    }
    return val?.liane;
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
