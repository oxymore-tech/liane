// GOOGLE_API_KEY, DD_CLIENT_TOKEN and DD_APP_ID registered as secrets
// ENV_NAME as any other env. variable
const { GOOGLE_API_KEY, DD_CLIENT_TOKEN, DD_APP_ID, ENV_NAME } = process.env;

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
    bundleIdentifier: "tech.oxymore.liane",
    buildNumber: "29",
    config: {
      googleMapsApiKey: GOOGLE_API_KEY
    }
  },
  android: {
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION"
    ],
    package: "tech.oxymore.liane",
    versionCode: 29,
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFFFF"
    },
    config: {
      googleMaps: {
        apiKey: GOOGLE_API_KEY
      }
    }
  },
  extra: {
    envName: ENV_NAME,
    datadogClientToken: DD_CLIENT_TOKEN,
    datadogAppId: DD_APP_ID
  }
};
