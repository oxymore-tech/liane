import { AbstractLocationService, AppEnv as CommonAppEnv, AppStorage as CommonAppStorage, LatLng } from "@liane/common";
import BackgroundGeolocationService from "native-modules/geolocation";
import GetLocation from "react-native-get-location";

export const LianeGeolocation = BackgroundGeolocationService;

export class ReactNativeLocationService extends AbstractLocationService {
  constructor(env: CommonAppEnv, storage: CommonAppStorage, defaultLocation: LatLng) {
    super(env, storage, defaultLocation);
  }

  async currentLocationImpl(): Promise<LatLng> {
    const loc = await GetLocation.getCurrentPosition({ timeout: 8000, enableHighAccuracy: true });
    return { lat: loc.latitude, lng: loc.longitude };
  }
}
