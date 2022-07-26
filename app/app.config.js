// DD_CLIENT_TOKEN and DD_APP_ID registered as secrets
// ENV_NAME as any other envi. variable
const { DD_CLIENT_TOKEN, DD_APP_ID, ENV_NAME } = process.env;

export default {
  name: "Liane",
  slug: "liane",
  version: "1.0.0",
  orientation: "portrait",
  owner: "oxymore-tech",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash_vlow.png",
    resizeMode: "contain",
    backgroundColor: "#FFFFFF"
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    infoPlist: {
      UIBackgroundModes: [
        "location",
        "fetch"
      ],
      NSLocationAlwaysUsageDescription: "This app collects your GPS location to anonymously register your car travels.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "This app collects your GPS location to anonymously register your car travels."
    },
    bundleIdentifier: "tech.oxymore.liane",
    buildNumber: "24"
  },
  android: {
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.FOREGROUND_SERVICE"
    ],
    package: "tech.oxymore.liane",
    versionCode: 24,
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFFFF"
    },
    softwareKeyboardLayoutMode: "pan"
  },
  extra: {
    envName: ENV_NAME,
    datadogClientToken: DD_CLIENT_TOKEN,
    datadogAppId: DD_APP_ID
  }
};
