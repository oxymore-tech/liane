import React, { createContext, ReactNode, useEffect, useState } from "react";
import { Inter_400Regular, useFonts } from "@expo-google-fonts/inter";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { me } from "@/api/client";
import * as Location from "expo-location";
import { registerLocationTask } from "@/api/location-task";
import { AuthUser, LocPermLevel } from "@/api";
import { getStoredToken } from "@/api/storage";

// type LocationPermissionLevel = "never" | "active" | "always";
// Implies type inference problem

/**
 * Application context format.
 */
interface AppContextProps {
  appLoaded: boolean; // Whether the app. has loaded
  expoPushToken?: string; // Notification token
  locationPermission: LocPermLevel; // Tracking permission level
  setLocationPermission: (locationPermissionGranted: LocPermLevel) => void; // Modifier for the previous
  authUser?: AuthUser; // Authenticated user
  setAuthUser: (authUser?: AuthUser) => void; // Modifier for the previous
}

/**
 * Create default context.
 */
export const AppContext = createContext<AppContextProps>({
  appLoaded: false,
  locationPermission: LocPermLevel.NEVER,
  setLocationPermission: () => { },
  setAuthUser: () => { }
});

/**
 * Ask for the permission to send push notifications and define their
 * parameters.
 */
async function registerForPushNotificationsAsync():Promise<string|undefined> {
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
  return undefined;
}

/**
 * Initialise the context by getting whether the app. is
 * authorised to track the device and at which level.
 */
async function init() : Promise<{ authUser?:AuthUser, permission:LocPermLevel }> {
  const permissionBackground = await Location.getBackgroundPermissionsAsync();
  const permissionForeground = await Location.getForegroundPermissionsAsync();
  const storedToken = await getStoredToken();
  console.log("token", storedToken);
  const authUser = storedToken ? await me().catch(() => undefined) : undefined;
  
  // Select the right permission level
  // with the assumption that : background => foreground
  let permissionLevel;
  if (permissionBackground.status === "granted") {
    permissionLevel = LocPermLevel.ALWAYS;
  } else if (permissionForeground.status === "granted") {
    permissionLevel = LocPermLevel.ACTIVE;
  } else {
    permissionLevel = LocPermLevel.NEVER;
  }
  
  return { authUser, permission: permissionLevel };
}

/**
 * Define the context of the application.
 * @param props 
 * @constructor
 */
export function ContextProvider(props: { children: ReactNode }) {
  const [fontLoaded] = useFonts({ Inter: Inter_400Regular });
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [appLoaded, setAppLoaded] = useState(false);
  const [authUser, setInternalAuthUser] = useState<AuthUser>();
  const [locationPermission, setLocationPermission] = useState(LocPermLevel.NEVER);

  const setAuthUser = async (a?: AuthUser) => {
    if (a) {
      const token = a?.token;
      console.log("storeToken", token);
      await AsyncStorage.setItem("token", token);
    }
    setInternalAuthUser(a);
  };
  
  // Launch the locations recuperation
  useEffect(() => {
    if (locationPermission === LocPermLevel.ACTIVE || locationPermission === LocPermLevel.ALWAYS) {
      registerLocationTask().then();
    }
  }, [locationPermission]);
  
  // Modify the permission
  useEffect(() => {
    init()
      .then((r) => {
        setLocationPermission(r.permission);
        return setAuthUser(r.authUser);
      })
      .then(() => setAppLoaded(true));
  }, []);
  
  // Ask for push notification permission
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => {
        setExpoPushToken(token);
      });
  }, []);

  const { children } = props;

  return (
    <AppContext.Provider
      value={{
        appLoaded: appLoaded && fontLoaded,
        expoPushToken,
        locationPermission: locationPermission,
        setLocationPermission: setLocationPermission,
        authUser,
        setAuthUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
