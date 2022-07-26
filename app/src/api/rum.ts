import "./mockDatadog";
import { DdSdkReactNative, DdSdkReactNativeConfiguration } from "@datadog/mobile-react-native";
import Constants from "expo-constants";

// Register the RUM
export async function registerRum() {
  if (Constants.manifest?.extra) {
    const { envName, datadogClientToken, datadogAppId } = Constants.manifest.extra;
    if (envName && datadogClientToken && datadogAppId) {
      const config = new DdSdkReactNativeConfiguration(datadogClientToken, envName, datadogAppId, true, true, true);

      config.site = "EU";
      config.nativeCrashReportEnabled = true;

      await DdSdkReactNative.initialize(config);
    }
  }
}

// Register the corresponding user
export async function registerRumUser(phone: string, token: string) {
  // await DdSdkReactNative.setUser({
  //   phone,
  //   id: token,
  //   name: "Dummy",
  //   email: "dummy@liane.fr"
  // });
  // J'ai une erreur quand ça run :
  // [Unhandled promise rejection: TypeError: null is not an object (evaluating '_foundation.DdSdk.setUser')]
  // Et on tombe sur une issue ouverte par Augustin : https://github.com/DataDog/dd-sdk-reactnative/issues/47#issuecomment-1010376523
}
