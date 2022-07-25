import React, {
  createContext, ReactNode, useCallback, useEffect, useState
} from "react";
import {
  Inter_200ExtraLight,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts
} from "@expo-google-fonts/inter";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { me } from "@/api/client";
import * as Location from "expo-location";
import { startLocationTask } from "@/api/location";
import { AuthUser, LocationPermissionLevel } from "@/api";
import { getStoredToken } from "@/api/storage";
import * as SplashScreen from "expo-splash-screen";

/**
 * Application context format.
 */
interface AppContextProps {
  appLoaded: boolean; // Whether the app. has loaded
  expoPushToken?: string; // Notification token
  locationPermissionLevel: LocationPermissionLevel; // Tracking permission level
  setLocationPermissionLevel: (locationPermissionGranted: LocationPermissionLevel) => void; // Modifier for the previous
  authUser?: AuthUser; // Authenticated user
  setAuthUser: (authUser?: AuthUser) => void; // Modifier for the previous
}

/**
 * Create default context.
 */
export const AppContext = createContext<AppContextProps>({
  appLoaded: false,
  locationPermissionLevel: LocationPermissionLevel.NEVER,
  setLocationPermissionLevel: () => { },
  setAuthUser: () => { }
});

/**
 * Ask for the permission to send push notifications and define their
 * parameters.
 */
async function registerForPushNotificationsAsync(): Promise<string|undefined> {
  try {
    if (Constants.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        alert("Failed to get push token for push notification!");
        return undefined;
      }

      const expoPushToken = await Notifications.getExpoPushTokenAsync();

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C"
        });
      }
      return expoPushToken.data;
    }
    alert("Must use physical device for Push Notifications");
  } catch (e) {
    console.log("error while registering for push notifications", e);
  }
  return undefined;
}

/**
 * Initialise the context by getting whether the app. is
 * authorised to track the device and at which level.
 */
async function initContext(): Promise<{ authUser?:AuthUser, permission:LocationPermissionLevel }> {
  const permissionBackground = await Location.getBackgroundPermissionsAsync();
  const permissionForeground = await Location.getForegroundPermissionsAsync();
  const storedToken = await getStoredToken();
  const authUser = storedToken ? await me().catch(() => undefined) : undefined;

  console.log(`Permission status are ${permissionBackground.status} and ${permissionForeground.status}`);
  console.log(`Authenticated user is ${authUser}`);

  // Select the right permission level
  // with the assumption that : background => foreground
  let permissionLevel;
  if (permissionBackground.status === "granted") {
    permissionLevel = LocationPermissionLevel.ALWAYS;
  } else if (permissionForeground.status === "granted") {
    permissionLevel = LocationPermissionLevel.ACTIVE;
  } else if (permissionForeground.status === "denied" || permissionBackground.status === "denied") {
    permissionLevel = LocationPermissionLevel.NEVER;
  } else {
    permissionLevel = LocationPermissionLevel.NEVER;
  }

  return { authUser, permission: permissionLevel };
}

async function waitForContext(): Promise<{ authUser?:AuthUser, permission:LocationPermissionLevel }> {
  await SplashScreen.preventAutoHideAsync();
  return initContext();
}

/**
 * Define the context of the application.
 */
function ContextProvider(props: { children: ReactNode }) {
  const [fontLoaded] = useFonts({
    Inter_ExtraLight: Inter_200ExtraLight,
    Inter: Inter_400Regular,
    Inter_Medium: Inter_500Medium,
    Inter_SemiBold: Inter_600SemiBold,
    Inter_Bold: Inter_700Bold
  });

  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [appLoaded, setAppLoaded] = useState(false);
  const [authUser, setInternalAuthUser] = useState<AuthUser>();
  const [locationPermissionLevel, setLocationPermissionLevel] = useState(LocationPermissionLevel.NEVER);

  const setAuthUser = async (a?: AuthUser) => {
    try {
      if (a) {
        const token = a?.token;
        console.log("storeToken", a?.token);
        await AsyncStorage.setItem("token", token);
      } else {
        await AsyncStorage.removeItem("token");
      }
      setInternalAuthUser(a);
    } catch (e) {
      console.log("Problem while setting auth user : ", e);
    }
  };

  // Launch the locations recuperation
  useEffect(() => {
    startLocationTask(locationPermissionLevel).then();
  }, [locationPermissionLevel]);

  // Get the context and wait for it before showing the app
  useEffect(() => {
    waitForContext()
      .then((p) => {
        setLocationPermissionLevel(p.permission);
        setAuthUser(p.authUser).then(() => setAppLoaded(true));
      });
  }, []);

  // Ask for push notification permission
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => {
        setExpoPushToken(token);
      }, (result) => {
        console.log("Impossible de récupérer de jeton d'authentification des notifications, l'application ne peut donc pas fonctionner :");
        console.log(result);
      });
  }, []);

  const { children } = props;

  const onLayoutRootView = useCallback(async () => {
    if (appLoaded) {
      // If called after `setAppLoaded`, we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels.
      // So instead, we hide the splash screen once we know the root view has already
      // performed layout.
      await SplashScreen.hideAsync();
    }
  }, [appLoaded]);

  if (!appLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AppContext.Provider
        value={{
          appLoaded: appLoaded && fontLoaded,
          expoPushToken,
          locationPermissionLevel,
          setLocationPermissionLevel,
          authUser,
          setAuthUser
        }}
      >
        {children}
      </AppContext.Provider>
    </View>
  );
}

export default ContextProvider;
