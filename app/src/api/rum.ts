import "./mockDatadog";
import { DdSdkReactNative, DdSdkReactNativeConfiguration } from "@datadog/mobile-react-native";

// DD_CLIENT_TOKEN and DD_APP_ID registered as secrets
// ENV_NAME as any other envi. variable
const { DD_CLIENT_TOKEN, DD_APP_ID, ENV_NAME } = process.env;

// Register the RUM
export async function registerRum() {
  if (DD_CLIENT_TOKEN && DD_APP_ID && ENV_NAME) {
    const config = new DdSdkReactNativeConfiguration(DD_CLIENT_TOKEN, ENV_NAME, DD_APP_ID, true, true, true);

    config.site = "EU";
    config.nativeCrashReportEnabled = true;

    await DdSdkReactNative.initialize(config);
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
