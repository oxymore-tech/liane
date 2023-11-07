import { DdSdkReactNative, DdSdkReactNativeConfiguration } from "@datadog/mobile-react-native";
import { RNAppEnv } from "@/api/env";

export async function initializeRum() {
  const { DD_CLIENT_TOKEN, DD_APP_ID, APP_ENV, APP_VERSION } = RNAppEnv.raw;

  if (DD_CLIENT_TOKEN && DD_APP_ID) {
    const config = new DdSdkReactNativeConfiguration(DD_CLIENT_TOKEN, APP_ENV, DD_APP_ID, true, true, true);

    config.site = "EU1";
    config.nativeCrashReportEnabled = true;
    config.version = APP_VERSION;
    await DdSdkReactNative.initialize(config);
  }
}

export async function registerRumUser(user: { id?: string; pseudo?: string; isAdmin: boolean }) {
  await DdSdkReactNative.setUser(user);
}
