import { AbstractLocationService, AppEnv as CommonAppEnv, AppStorage as CommonAppStorage, LatLng, HttpClient } from "@liane/common";
import BackgroundGeolocationService from "native-modules/geolocation";
import GetLocation from "react-native-get-location";

export const LianeGeolocation = BackgroundGeolocationService;

export class ReactNativeLocationService extends AbstractLocationService {
  constructor(env: CommonAppEnv, storage: CommonAppStorage, http: HttpClient, defaultLocation: LatLng) {
    super(env, storage, http, defaultLocation);
  }

  async currentLocationImpl(): Promise<LatLng> {
    const loc = await GetLocation.getCurrentPosition({ timeout: 8000, enableHighAccuracy: true });
    return { lat: loc.latitude, lng: loc.longitude };
  }
}
