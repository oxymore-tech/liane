import { DdSdkReactNative, DdSdkReactNativeConfiguration } from "@datadog/mobile-react-native";
import Constants from "expo-constants";
import { AuthUser } from "@/api/index";

export async function registerRum() {
  if (!__DEV__ && Constants.manifest?.extra) {
    const { envName, datadogClientToken, datadogAppId } = Constants.manifest.extra;
    if (envName && datadogClientToken && datadogAppId) {
      const config = new DdSdkReactNativeConfiguration(datadogClientToken, envName, datadogAppId, true, true, true);

      config.site = "EU";
      config.nativeCrashReportEnabled = true;

      await DdSdkReactNative.initialize(config);
    }
  }
}

export async function registerRumUser(user: AuthUser) {
  if (!__DEV__) {
    await DdSdkReactNative.setUser(user);
  }
}
