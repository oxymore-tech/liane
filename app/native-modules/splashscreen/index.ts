import { NativeModules, Platform } from "react-native";
const { SplashScreenModule } = NativeModules;

export default {
  hide: () => {
    if (Platform.OS === "android") {
      SplashScreenModule.hide();
    }
  }
};
