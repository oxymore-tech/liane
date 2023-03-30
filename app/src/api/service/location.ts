import { LatLng, RallyingPoint } from "@/api";
import { Alert, Linking, PermissionsAndroid, Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";
import { retrieveAsync, storeAsync } from "@/api/storage";
export interface LocationService {
  currentLocation(): Promise<LatLng>;
  getLastKnownLocation(): LatLng;
  cacheRecentLocation(rallyingPoint: RallyingPoint): Promise<RallyingPoint[]>;
  getRecentLocations(): Promise<RallyingPoint[]>;
}

const cacheSize = 5;
const rallyingPointsKey = "rallyingPoints";
const lastKnownLocationKey = "last_known_loc";

export class LocationServiceClient implements LocationService {
  // Default location
  private lastKnownLocation = {
    lat: 44.3593807,
    lng: 3.4336323
  };

  constructor() {
    retrieveAsync<LatLng>(lastKnownLocationKey).then(res => {
      if (res) {
        this.lastKnownLocation = res;
      }
    });
  }
  private hasPermissionIOS = async () => {
    const openSetting = () => {
      Linking.openSettings().catch(() => {
        if (__DEV__) {
          console.warn("Unable to open settings");
        }
      });
    };
    const status = await Geolocation.requestAuthorization("whenInUse");

    if (status === "granted") {
      return true;
    }

    if (status === "denied") {
      if (__DEV__) {
        console.warn("Location permission denied");
      }
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
        console.log("Location permission denied by user");
      }
    } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      if (__DEV__) {
        console.log("Location permission revoked by user");
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
}
