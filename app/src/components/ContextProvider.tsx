import React, { createContext, ReactNode, useEffect, useState } from "react";
import { Inter_400Regular, useFonts } from "@expo-google-fonts/inter";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { me } from "@/api/client";
import * as Location from "expo-location";
import { registerLocationTask } from "@/api/location-task";
import { AuthUser } from "@/api";
import { getStoredToken } from "@/api/storage";

interface AppContextProps {
  appLoaded:boolean;
  expoPushToken?: string;
  locationPermissionGranted: boolean;
  setLocationPermissionGranted: (locationPermissionGranted: boolean) => void;
  authUser?: AuthUser;
  setAuthUser: (authUser?: AuthUser) => void;
}

export const AppContext = createContext<AppContextProps>({
  appLoaded: false,
  locationPermissionGranted: false,
  setLocationPermissionGranted: () => { },
  setAuthUser: () => { }
});

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
    return expoPushToken.data;
  }
  alert("Must use physical device for Push Notifications");

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C"
    });
  }
  return undefined;
}

async function init() : Promise<{ authUser?:AuthUser, permissionGranted:boolean }> {
  const permission = await Location.getBackgroundPermissionsAsync();
  const storedToken = await getStoredToken();
  console.log("token", storedToken);
  const authUser = storedToken ? await me().catch(() => undefined) : undefined;
  return { authUser, permissionGranted: permission.status === "granted" };
}

export function ContextProvider(props: { children: ReactNode }) {
  const [fontLoaded] = useFonts({ Inter: Inter_400Regular });
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [appLoaded, setAppLoaded] = useState(false);
  const [authUser, setInternalAuthUser] = useState<AuthUser>();
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  const setAuthUser = async (a?: AuthUser) => {
    if (a) {
      const token = a?.token;
      console.log("storeToken", token);
      await AsyncStorage.setItem("token", token);
    }
    setInternalAuthUser(a);
  };

  useEffect(() => {
    if (locationPermissionGranted) {
      registerLocationTask().then();
    }
  }, [locationPermissionGranted]);

  useEffect(() => {
    init()
      .then((r) => {
        setLocationPermissionGranted(r.permissionGranted);
        return setAuthUser(r.authUser);
      })
      .then(() => setAppLoaded(true));
  }, []);

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
        locationPermissionGranted,
        setLocationPermissionGranted,
        authUser,
        setAuthUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
