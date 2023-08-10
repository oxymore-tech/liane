import { LatLng, RallyingPoint, WayPoint } from "@/api";
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

    console.log(url);
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

type LocationPingsSenderProps = { liane: string; trip: WayPoint[]; delay: number };

const hasPermissionIOS = async (): Promise<boolean> => {
  const openSetting = () => {
    Linking.openSettings().catch(() => {
      if (__DEV__) {
        console.warn("[LOCATION] Unable to open settings");
      }
    });
  };
  const status = await Geolocation.requestAuthorization("whenInUse");

  if (status === "granted") {
    return true;
  }

  if (status === "denied") {
    Alert.alert("Localisation désactivée", `Liane ne pourra pas accéder à votre position. Certaines fonctionnalités risquent d'être limitées'.`);
    return await hasPermissionIOS();
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
    if (__DEV__) {
      console.log("[LOCATION] Location permission denied by user");
    }
  } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    if (__DEV__) {
      console.log("[LOCATION] Location permission revoked by user");
    }
  }

  return false;
};

export async function checkLocationPingsPermissions(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const access = await Geolocation.requestAuthorization("always");
    console.debug("[GEOPINGS]", access);
    return access === "granted";
  } else if (Platform.OS === "android") {
    return (
      Platform.Version < 23 ||
      (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)) ||
      Platform.Version < 29 ||
      (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION))
    );
  }
  return true;
}

export async function cancelSendLocationPings() {
  if (Platform.OS === "ios") {
    await BackgroundService.stop();
  } else {
    await BackgroundGeolocationService.stop();
  }
}
export async function sendLocationPings(lianeId: string, wayPoints: WayPoint[], delay: number = 0): Promise<void> {
  console.debug("[GEOPINGS]", "start...");
  console.debug(
    "[GEOPINGS]",
    lianeId,
    wayPoints.map(w => w.rallyingPoint.label)
  );
  if (Platform.OS === "ios") {
    //@ts-ignore
    return BackgroundService.start<LocationPingsSenderProps>(shareLocationTask, {
      taskTitle: "Géolocalisation en cours",
      taskName: "geolocation_" + lianeId,
      taskDesc: "Liane partage votre position sur le trajet à destination de " + wayPoints[wayPoints.length - 1].rallyingPoint.label,
      taskIcon: { name: "ic_launcher", type: "mipmap" },
      parameters: { liane: lianeId, trip: wayPoints, delay }
    }).catch(err => console.warn(err));
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
}

export const isLocationServiceRunning = () =>
  Platform.OS === "ios" ? Promise.resolve(BackgroundService.isRunning()) : BackgroundGeolocationService.isRunning();

const nearWayPointRadius = 1000;
const shareLocationTask = async ({ liane, trip, delay }: LocationPingsSenderProps) => {
  const user = await getCurrentUser();
  const tripDuration = new Date(trip[trip.length - 1].eta).getTime() - new Date().getTime();
  const timeout = tripDuration + 3600 * 1000;
  let preciseTrackingMode = true;
  let watchId: number = 0;
  if (!user) {
    throw new Error("User not found");
  }

  console.debug("[GEOPINGS]", `tracking timeout = ${timeout} ms`);
  await new Promise<void>(async resolve => {
    const getDistanceFilter = () => (preciseTrackingMode ? 10 : nearWayPointRadius / 2);

    const switchTrackingMode = (precise: boolean) => {
      Geolocation.clearWatch(watchId);
      preciseTrackingMode = precise;
      startTracking(precise ? "best" : "nearestTenMeters", getDistanceFilter());
    };

    const stopTracking = () => {
      Geolocation.clearWatch(watchId);

      resolve();
    };
    const positionCallback: Geolocation.SuccessCallback = position => {
      // Send position ping
      console.debug("[GEOPINGS]", position);
      const coordinate = { lat: position.coords.latitude, lng: position.coords.longitude };
      const ping: MemberPing = {
        ...{
          type: "MemberPing",
          liane: liane,
          coordinate,
          timestamp: Math.trunc(position.timestamp)
        },
        ...(delay > 0 ? { delay } : {})
      };
      postAs(`/event/member_ping`, { body: ping }).catch(err => console.warn("[GEOPINGS]", "Could not send ping", err));
      const nearWayPointIndex = trip.findIndex(w => distance(coordinate, w.rallyingPoint.location) <= nearWayPointRadius);
      if (nearWayPointIndex > -1) {
        if (!preciseTrackingMode) {
          // Enable precise tracking
          switchTrackingMode(true);
        } else if (nearWayPointIndex === trip.length - 1) {
          console.debug("[GEOPINGS] Reached destination. Tracking will stop in 5 minutes.");
          sleep(5 * 60 * 1000).then(() => {
            console.debug("[GEOPINGS] Done!");
            stopTracking();
          });
        }
      } else if (preciseTrackingMode) {
        // Disable precise tracking
        switchTrackingMode(false);
      }
    };

    const startTracking = (accuracy: Geolocation.AccuracyIOS, distanceFilter: number) => {
      watchId = Geolocation.watchPosition(
        positionCallback,
        err => {
          console.warn("[GEOPINGS]", err);
        },
        {
          distanceFilter: distanceFilter,
          accuracy: { ios: accuracy },
          showsBackgroundLocationIndicator: true,
          showLocationDialog: true
        }
      );
    };

    // Start tracking
    startTracking("best", getDistanceFilter());
    await sleep(timeout);
    // Clean up
    console.debug("[GEOPINGS] Service timed out");
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
