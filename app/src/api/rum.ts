import { DdSdkReactNative, DdSdkReactNativeConfiguration } from "@datadog/mobile-react-native";
import { ENV_NAME as envName, DD_APP_ID as datadogAppId, DD_CLIENT_TOKEN as datadogClientToken } from "@env";
import { AuthUser } from "@/api/index";

export async function registerRum() {
  if (!__DEV__) {
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
