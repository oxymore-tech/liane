import { DdSdkReactNative, DdSdkReactNativeConfiguration } from "@datadog/mobile-react-native";
import { APP_ENV, APP_VERSION, DD_APP_ID, DD_CLIENT_TOKEN } from "@env";
import { AuthUser } from "@/api/index";

export async function registerRum() {
  if (!__DEV__) {
    if (APP_ENV && DD_CLIENT_TOKEN && DD_APP_ID) {
      const config = new DdSdkReactNativeConfiguration(DD_CLIENT_TOKEN, APP_ENV, DD_APP_ID, true, true, true);

      config.site = "EU";
      config.nativeCrashReportEnabled = true;
      config.version = APP_VERSION;

      await DdSdkReactNative.initialize(config);
    }
  }
}

export async function registerRumUser(user: AuthUser) {
  await DdSdkReactNative.setUser(user);
}
