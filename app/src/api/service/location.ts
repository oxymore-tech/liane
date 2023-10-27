import { LatLng, Liane, RallyingPoint, WayPoint } from "@/api";
import { Alert, Linking, PermissionsAndroid, Platform } from "react-native";
import Geolocation, { GeoOptions, GeoPosition } from "react-native-geolocation-service";
import { getAccessToken, getCurrentUser, retrieveAsync, storeAsync } from "@/api/storage";
import { DEFAULT_TLS } from "@/api/location";
import { MAPTILER_KEY } from "@env";
import { Feature, Geometry, Point } from "geojson";
import BackgroundService from "react-native-background-actions";
import { BaseUrl, postAs, tryRefreshToken } from "@/api/http";
import { MemberPing } from "@/api/event";
import { sleep } from "@/util/datetime";
import BackgroundGeolocationService from "native-modules/geolocation";
import { distance } from "@/util/geometry";
import { check, PERMISSIONS, request } from "react-native-permissions";
import { AppLogger } from "@/api/logger";
import { BehaviorSubject } from "rxjs";
import { isResourceNotFound, isValidationError } from "@/api/exception";

export interface LocationService {
  currentLocation(): Promise<LatLng>;
  getLastKnownLocation(): LatLng;
  cacheRecentLocation(rallyingPoint: RallyingPoint): Promise<RallyingPoint[]>;
  getRecentLocations(): Promise<RallyingPoint[]>;
  cacheRecentPlaceLocation(rallyingPoint: SearchedLocation): Promise<SearchedLocation[]>;
  getRecentPlaceLocations(): Promise<SearchedLocation[]>;
  cacheRecentTrip(trip: Trip): Promise<Trip[]>;
  getRecentTrips(): Promise<Trip[]>;
  search(
    query: string,
    closeTo?: LatLng
  ): Promise<{
    type: "FeatureCollection";
    features: Array<SearchedLocationSuggestion>;
  }>;
}

export type Trip = {
  from: RallyingPoint;
  to: RallyingPoint;
};

export const getKeyForTrip = (trip: Trip) => {
  return trip.from.id + "_" + trip.to.id;
};

const cacheSize = 5;
const rallyingPointsKey = "rallyingPoints";
const recentPlacesKey = "recent_places";
const tripsKey = "trips";
const lastKnownLocationKey = "last_known_loc";

export class LocationServiceClient implements LocationService {
  // Default location
  private lastKnownLocation = DEFAULT_TLS;

  constructor() {
    retrieveAsync<LatLng>(lastKnownLocationKey).then(res => {
      if (res) {
        this.lastKnownLocation = res;
      }
    });
  }

  async cacheRecentLocation(rallyingPoint: RallyingPoint): Promise<RallyingPoint[]> {
    let cachedValues = (await retrieveAsync<RallyingPoint[]>(rallyingPointsKey)) ?? [];
    cachedValues = cachedValues.filter(v => v.id !== rallyingPoint.id);
    cachedValues.unshift(rallyingPoint);
    cachedValues = cachedValues.slice(0, cacheSize);
    await storeAsync<RallyingPoint[]>(rallyingPointsKey, cachedValues);

    return cachedValues;
  }

  async getRecentLocations(): Promise<RallyingPoint[]> {
    return (await retrieveAsync<RallyingPoint[]>(rallyingPointsKey)) ?? [];
  }

  async cacheRecentPlaceLocation(p: SearchedLocation): Promise<SearchedLocation[]> {
    let cachedValues = (await retrieveAsync<SearchedLocation[]>(recentPlacesKey)) ?? [];
    cachedValues = cachedValues.filter(
      v =>
        (isRallyingPointSearchedLocation(v) ? v.properties!.id : v.properties!.ref) !==
        (isRallyingPointSearchedLocation(p) ? p.properties!.id : p.properties!.ref)
    );
    cachedValues.unshift(p);
    cachedValues = cachedValues.slice(0, cacheSize);
    await storeAsync<SearchedLocation[]>(recentPlacesKey, cachedValues);

    return cachedValues;
  }

  async getRecentPlaceLocations(): Promise<SearchedLocation[]> {
    return (await retrieveAsync<SearchedLocation[]>(recentPlacesKey)) ?? [];
  }

  async cacheRecentTrip(trip: Trip): Promise<Trip[]> {
    let cachedValues = (await retrieveAsync<Trip[]>(tripsKey)) ?? [];
    cachedValues = cachedValues.filter(v => getKeyForTrip(v) !== getKeyForTrip(trip));
    cachedValues.unshift(trip);
    cachedValues = cachedValues.slice(0, cacheSize);
    await storeAsync<Trip[]>(tripsKey, cachedValues);

    return cachedValues;
  }

  async getRecentTrips(): Promise<Trip[]> {
    return (await retrieveAsync<Trip[]>(tripsKey)) ?? [];
  }

  currentLocation(): Promise<LatLng> {
    return new Promise<LatLng>(async (resolve, reject) => {
      const enabled = await hasLocationPermission();
      if (!enabled) {
        reject(new Error("location access denied"));
      } else {
        Geolocation.getCurrentPosition(
          position => {
            this.lastKnownLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            storeAsync<LatLng>(lastKnownLocationKey, this.lastKnownLocation);
            resolve(this.lastKnownLocation);
          },
          error => {
            reject(error);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      }
    });
  }

  getLastKnownLocation(): LatLng {
    return this.lastKnownLocation;
  }

  async search(
    query: string,
    closeTo?: LatLng
  ): Promise<{
    type: "FeatureCollection";
    features: Array<SearchedLocationSuggestion>;
  }> {
    let url = `https://api.maptiler.com/geocoding/${query}.json`;

    const types = [
      "joint_municipality",
      "joint_submunicipality",
      "municipality",
      "municipal_district",
      "locality",
      "neighbourhood",
      "place",
      "postal_code",
      "address",
      "poi"
    ];

    url += `?key=${MAPTILER_KEY}`;
    url += `&country=${["fr"]}`;
    url += `&language=${["fr"]}`;
    url += `&types=${types}`;
    if (closeTo) {
      url += `&proximity=${[closeTo.lng, closeTo.lat]}`;
    }

    //console.log(url);
    const response = await fetch(url, {
      method: "GET"
    });
    if (response.status === 200) {
      return response.json();
    } else {
      throw new Error("API returned error " + response.status);
    }
  }
}

export async function getCurrentLocation(options?: GeoOptions) {
  //TODO no export
  return new Promise<GeoPosition>(async (resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve(position);
      },
      error => {
        reject(error);
      },
      options || { enableHighAccuracy: true, timeout: 5000, maximumAge: 5000 }
    );
  });
}

type LocationPingsSenderProps = { liane: string; trip: WayPoint[] };

const hasPermissionIOS = async (): Promise<boolean> => {
  const openSetting = () => {
    Linking.openSettings().catch(e => {
      AppLogger.warn("SETTINGS", "Unable to open settings", e);
    });
  };
  const status = await Geolocation.requestAuthorization("whenInUse");

  if (status === "granted") {
    return true;
  }

  if (status === "denied") {
    Alert.alert(
      "Localisation désactivée",
      `L'accès à votre position est désactivé dans les paramètres. Certaines fonctionnalités risquent d'être limitées'.`,
      [
        { text: "Paramètres", onPress: openSetting },
        { text: "Ignorer", onPress: () => {} }
      ]
    );
  }

  if (status === "disabled") {
    Alert.alert("Localisation désactivée", `Activez le GPS pour permettre à Liane d'utiliser votre position.`, [
      { text: "Paramètres", onPress: openSetting },
      { text: "Ignorer", onPress: () => {} }
    ]);
  }

  return false;
};

export const hasLocationPermission = async () => {
  if (Platform.OS === "ios") {
    return await hasPermissionIOS();
  }

  if (Platform.OS === "android" && Platform.Version < 23) {
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
  } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    AppLogger.debug("SETTINGS", "Location permission revoked by user");
  }

  return false;
};
export async function requestEnableGPS() {
  if (Platform.OS === "android") {
    try {
      await BackgroundGeolocationService.enableLocation();
      return true;
    } catch (error: unknown) {
      return false;
    }
  }
  return true;
}

export const requestBackgroundGeolocation = async () => {
  if (Platform.OS === "ios") {
    if (parseInt(Platform.Version, 10) < 13) {
      const status = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
      if (status === "granted") {
        return true;
      } else if (status === "denied") {
        Alert.alert(`Liane a besoin de suivre votre position pour pouvoir valider votre trajet.`);
      } else if (status === "unavailable") {
        Alert.alert(`Erreur: géolocalisation indisponible.`);
      } else if (status === "blocked") {
        const openSetting = () => {
          Linking.openSettings().catch(() => {
            AppLogger.warn("SETTINGS", "Unable to open settings");
          });
        };
        Alert.alert("Localisation requise", `Activez la géolocalisation pour permettre à Liane d'utiliser votre position.`, [
          { text: "Modifier les paramètres", onPress: openSetting },
          { text: "Ignorer", onPress: () => {} }
        ]);
      }
    } else {
      await Linking.openSettings();
    }
  } else if (Platform.OS === "android") {
    if (Platform.Version <= 29) {
      const status = await request(
        Platform.Version === 29 ? PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      );
      //console.log(status);
      if (status === "granted") {
        return true;
      } else if (status === "denied") {
        Alert.alert(`Liane a besoin de suivre votre position pour pouvoir valider votre trajet.`);
      } else if (status === "unavailable") {
        Alert.alert(`Erreur: géolocalisation indisponible.`);
      } else if (status === "blocked") {
        const openSetting = () => {
          Linking.openSettings().catch(() => {
            AppLogger.warn("SETTINGS", "Unable to open settings");
          });
        };
        Alert.alert("Localisation requise", `Pour continuez, allez dans "Autorisations" > "Localisation" puis sélectionnez "Toujours autoriser".`, [
          { text: "Modifier les paramètres", onPress: openSetting },
          { text: "Ignorer", onPress: () => {} }
        ]);
      }
    } else {
      await Linking.openSettings().catch(() => {
        AppLogger.warn("SETTINGS", "Unable to open settings");
      });
    }
  }
  return false;
};

export const requestGeolocation = async () => {
  if (Platform.OS === "ios") {
    const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    if (status === "granted") {
      return true;
    } else if (status === "denied") {
      Alert.alert(`Liane a besoin de suivre votre position pour pouvoir valider votre trajet.`);
    } else if (status === "unavailable") {
      Alert.alert(`Erreur: géolocalisation indisponible.`);
    } else if (status === "blocked") {
      const openSetting = () => {
        Linking.openSettings().catch(() => {
          AppLogger.warn("SETTINGS", "Unable to open settings");
        });
      };
      Alert.alert("Localisation requise", `Activez la géolocalisation pour permettre à Liane d'utiliser votre position.`, [
        { text: "Modifier les paramètres", onPress: openSetting },
        { text: "Ignorer", onPress: () => {} }
      ]);
    }
  } else if (Platform.OS === "android") {
    const status = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    //console.log(status);
    if (status === "granted") {
      return true;
    } else if (status === "denied") {
      Alert.alert(`Liane a besoin de suivre votre position pour pouvoir valider votre trajet.`);
    } else if (status === "unavailable") {
      Alert.alert(`Erreur: géolocalisation indisponible.`);
    } else if (status === "blocked") {
      const openSetting = () => {
        Linking.openSettings().catch(() => {
          AppLogger.warn("SETTINGS", "Unable to open settings");
        });
      };
      Alert.alert("Localisation requise", `Pour continuer, allez dans "Autorisations" > "Localisation" puis sélectionnez "Toujours autoriser".`, [
        { text: "Modifier les paramètres", onPress: openSetting },
        { text: "Ignorer", onPress: () => {} }
      ]);
    }
  }

  return false;
};

export async function checkLocationPingsPermissions(): Promise<boolean> {
  const access =
    Platform.OS === "ios"
      ? await check(PERMISSIONS.IOS.LOCATION_ALWAYS)
      : await check(Platform.Version === 29 ? PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
  AppLogger.info("GEOPINGS", `Location ping permission ${access}`);
  return access === "granted";
}

export async function cancelSendLocationPings() {
  try {
    if (Platform.OS === "ios") {
      await BackgroundService.stop();
      const value = running.getValue();
      if (!value) {
        return;
      }
      Geolocation.clearWatch(value.watchId);
      running.next(undefined);
    } else {
      await BackgroundGeolocationService.stop();
    }
    AppLogger.info("GEOPINGS", "Tracking canceled");
  } catch (e) {
    AppLogger.error("GEOPINGS", "Unable to cancel tracking", e);
  }
}

export async function startPositionTracking(lianeId: string, wayPoints: WayPoint[], delay: number = 0): Promise<void> {
  AppLogger.debug("GEOPINGS", "start...");
  AppLogger.debug(
    "GEOPINGS",
    lianeId,
    wayPoints.map(w => w.rallyingPoint.label)
  );
  try {
    if (Platform.OS === "ios") {
      //@ts-ignore
      await BackgroundService.start<LocationPingsSenderProps>(shareLocationTask, {
        taskTitle: "Géolocalisation en cours",
        taskName: "geolocation_" + lianeId,
        taskDesc: "Liane partage votre position sur le trajet à destination de " + wayPoints[wayPoints.length - 1].rallyingPoint.label,
        taskIcon: { name: "ic_launcher", type: "mipmap" },
        parameters: { liane: lianeId, trip: wayPoints, delay }
      });
    } else if (Platform.OS === "android") {
      const user = await getCurrentUser();
      // Refresh token here to avoid issues
      await tryRefreshToken(() => Promise.resolve());
      const token = await getAccessToken();

      const tripDuration = new Date(wayPoints[wayPoints.length - 1].eta).getTime() - new Date().getTime();
      const timeout = tripDuration + 3600 * 1000;

      await BackgroundGeolocationService.start({
        delay,
        pingConfig: { lianeId, userId: user!.id!, token: token!, url: BaseUrl },
        timeout,
        wayPoints: wayPoints.map(w => [w.rallyingPoint.location.lng, w.rallyingPoint.location.lat])
      });
    }
    AppLogger.info("GEOPINGS", "Tracking background task started", lianeId);
  } catch (e) {
    AppLogger.error("GEOPINGS", "Unable to start tracking background task", e);
  }
}

// Check if geolocation service is running
export const isLocationServiceRunning = (lianeId: string) =>
  Platform.OS === "ios" ? Promise.resolve(running.getValue()?.liane === lianeId) : BackgroundGeolocationService.isRunning(lianeId);

const running = new BehaviorSubject<{ liane: string; watchId: number } | undefined>(undefined);
export const watchLocationServiceState = (callback: (running: string | undefined) => void) =>
  Platform.OS === "ios" ? running.subscribe(l => callback(l?.liane)) : BackgroundGeolocationService.watch(callback);

const nearWayPointRadius = 1000;
const shareLocationTask = async ({ liane, trip }: LocationPingsSenderProps) => {
  const tripDuration = new Date(trip[trip.length - 1].eta).getTime() - new Date().getTime();
  const timeout = tripDuration + 3600 * 1000;
  let preciseTrackingMode = true;
  AppLogger.debug("GEOPINGS", `tracking timeout = ${timeout} ms`);
  await new Promise<void>(async resolve => {
    const getDistanceFilter = () => (preciseTrackingMode ? 10 : nearWayPointRadius / 2);

    const switchTrackingMode = (precise: boolean) => {
      const watchId = running.getValue()?.watchId;
      if (watchId) {
        Geolocation.clearWatch(watchId);
      }
      preciseTrackingMode = precise;
      const mode = precise ? "best" : "nearestTenMeters";
      AppLogger.info("GEOPINGS", "Switched tracking mode to:", mode);
      startTracking(mode, getDistanceFilter());
    };

    const stopTracking = () => {
      const watchId = running.getValue()?.watchId;
      if (watchId) {
        Geolocation.clearWatch(watchId);
      }
      AppLogger.info("GEOPINGS", "Tracking stopped", liane);
      running.next(undefined);
      resolve();
    };

    const positionCallback: Geolocation.SuccessCallback = position => {
      // Send position ping
      AppLogger.debug("GEOPINGS", "Position tracked", position);
      const coordinate = { lat: position.coords.latitude, lng: position.coords.longitude };
      const ping: MemberPing = {
        type: "MemberPing",
        liane: liane,
        coordinate,
        timestamp: Math.trunc(position.timestamp)
      };
      postAs(`/event/member_ping`, { body: ping }).catch(err => {
        AppLogger.warn("GEOPINGS", "Could not send ping", err);
        if (isResourceNotFound(err) || isValidationError(err)) {
          AppLogger.info("GEOPINGS", "Stopping service :", err);
          stopTracking();
        }
      });
      const nearWayPointIndex = trip.findIndex(w => distance(coordinate, w.rallyingPoint.location) <= nearWayPointRadius);
      if (nearWayPointIndex > -1) {
        if (!preciseTrackingMode) {
          // Enable precise tracking
          switchTrackingMode(true);
        } else if (nearWayPointIndex === trip.length - 1) {
          AppLogger.info("GEOPINGS", "Reached destination. Tracking will stop in 1 minute.");
          sleep(60 * 1000).then(() => {
            AppLogger.info("GEOPINGS", "Stopping service : done");
            stopTracking();
          });
        }
      } else if (preciseTrackingMode) {
        // Disable precise tracking
        switchTrackingMode(false);
      }
    };

    const startTracking = (accuracy: Geolocation.AccuracyIOS, distanceFilter: number) => {
      const watchId = Geolocation.watchPosition(
        positionCallback,
        err => {
          AppLogger.warn("GEOPINGS", "Error during IOS position tracking", err);
        },
        {
          distanceFilter: distanceFilter,
          accuracy: { ios: accuracy },
          showsBackgroundLocationIndicator: true,
          showLocationDialog: true
        }
      );
      running.next({ liane, watchId });
    };

    // Start tracking
    Geolocation.getCurrentPosition(
      positionCallback,
      err => {
        AppLogger.warn("GEOPINGS", err);
      },
      {
        accuracy: { ios: "best" }
      }
    );
    startTracking("best", getDistanceFilter());
    await sleep(timeout);
    // Clean up
    AppLogger.info("GEOPINGS", "Service timed out");
    stopTracking();
  });
};

export type SearchedLocation = RallyingPointSearchedLocation | SearchedLocationSuggestion;
export type RallyingPointSearchedLocation = Feature<Point, RallyingPoint> & { place_type: ["rallying_point"] };
export type SearchedLocationSuggestion = Readonly<
  {
    place_type_name: string[] | undefined;
    place_name: string;
    place_type: string[];
    context: Array<{ text: string }>;
  } & Feature<Geometry, { ref: string; categories: string[] }>
>;
export function isRallyingPointSearchedLocation(item: SearchedLocation): item is RallyingPointSearchedLocation {
  return item.place_type[0] === "rallying_point";
}

export function asSearchedLocation(rp: RallyingPoint): SearchedLocation {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [rp.location.lng, rp.location.lat] },
    properties: { ...rp },
    place_type: ["rallying_point"]
  };
}
