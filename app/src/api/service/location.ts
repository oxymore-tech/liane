import { LatLng, RallyingPoint } from "@/api";
import { Alert, Linking, PermissionsAndroid, Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";
import { retrieveAsync, storeAsync } from "@/api/storage";
import { DEFAULT_TLS } from "@/api/location";
import { MAPTILER_KEY } from "@env";
import { Feature, FeatureCollection } from "geojson";
export interface LocationService {
  currentLocation(): Promise<LatLng>;

  getLastKnownLocation(): LatLng;
  cacheRecentLocation(rallyingPoint: RallyingPoint): Promise<RallyingPoint[]>;
  getRecentLocations(): Promise<RallyingPoint[]>;

  cacheRecentPlaceLocation(rallyingPoint: Feature): Promise<Feature[]>;
  getRecentPlaceLocations(): Promise<Feature[]>;

  cacheRecentTrip(trip: Trip): Promise<Trip[]>;
  getRecentTrips(): Promise<Trip[]>;

  search(query: string, closeTo?: LatLng): Promise<FeatureCollection>;
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
  private hasPermissionIOS = async (): Promise<boolean> => {
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
      Alert.alert(`Location is needed for Liane to work properly.`);
      return await this.hasPermissionIOS();
    }

    if (status === "disabled") {
      Alert.alert(`Turn on Location Services to allow Liane to determine your location.`, "", [
        { text: "Go to Settings", onPress: openSetting },
        { text: "Don't Use Location", onPress: () => {} }
      ]);
    }

    return false;
  };

  private hasLocationPermission = async () => {
    if (Platform.OS === "ios") {
      return await this.hasPermissionIOS();
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

  async cacheRecentPlaceLocation(p: Feature): Promise<Feature[]> {
    let cachedValues = (await retrieveAsync<Feature[]>(recentPlacesKey)) ?? [];
    cachedValues = cachedValues.filter(v => (v.properties!.ref || v.properties!.id) !== (p.properties!.ref || p.properties!.id));
    cachedValues.unshift(p);
    cachedValues = cachedValues.slice(0, cacheSize);
    await storeAsync<Feature[]>(recentPlacesKey, cachedValues);

    return cachedValues;
  }

  async getRecentPlaceLocations(): Promise<Feature[]> {
    return (await retrieveAsync<Feature[]>(recentPlacesKey)) ?? [];
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
      const enabled = await this.hasLocationPermission();
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

  async search(query: string, closeTo?: LatLng): Promise<FeatureCollection> {
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
