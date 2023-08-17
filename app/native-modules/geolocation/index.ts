import { NativeModules, Platform } from "react-native";
const { BackgroundGeolocationServiceModule } = NativeModules;
const NativeModule = BackgroundGeolocationServiceModule as BackgroundGeolocationServiceInterface;
interface BackgroundGeolocationServiceInterface {
  startService(config: BackgroundGeolocationServiceConfig): Promise<void>;
  stopService(): Promise<void>;
  enableLocation(): Promise<void>;
  isRunning(): Promise<boolean>;
}

export type BackgroundGeolocationServiceConfig = {
  delay?: number;
  pingConfig: { url: string; token: string; userId: string; lianeId: string };
  geolocationConfig?: {
    interval: number;
    nearWayPointRadius: number;
    nearWayPointInterval: number;
  };

  wayPoints: [number, number][];
  timeout: number;
};

export const DefaultConfig = {
  geolocationConfig: {
    interval: 90,
    nearWayPointInterval: 10,
    nearWayPointRadius: 2000
  }
};

const start = (config: BackgroundGeolocationServiceConfig) => {
  if (Platform.OS === "android") {
    const nativeConfig: any = config;
    nativeConfig.geolocationConfig = config.geolocationConfig || DefaultConfig.geolocationConfig;
    nativeConfig.wayPoints = config.wayPoints.map(w => w.join(",")).join(";");
    return NativeModule.startService(nativeConfig);
  }
  return Promise.reject();
};

export default {
  start,
  stop: Platform.OS === "android" ? NativeModule.stopService : () => Promise.reject(),
  enableLocation: Platform.OS === "android" ? NativeModule.enableLocation : Promise.resolve,
  isRunning: Platform.OS === "android" ? NativeModule.isRunning : () => Promise.resolve(false)
};
