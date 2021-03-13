import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { AuthUser } from "@api/index";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AppContextProps {
  expoPushToken?: string;
  authUser?: AuthUser;
  setAuthUser: (authUser?: AuthUser) => void;
}

export const AppContext = createContext<AppContextProps>({
  setAuthUser: () => {
  }
});

async function registerForPushNotificationsAsync() {
  if (Constants.isDevice) {
    const {status: existingStatus} = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const {status} = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    const expoPushToken = await Notifications.getExpoPushTokenAsync();
    return expoPushToken.data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

export function ContextProvider(props: { children: ReactNode }) {

  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [authUser, setInternalAuthUser] = useState<AuthUser>();

  const setAuthUser = async (a?: AuthUser) => {
    if (a) {
      await AsyncStorage.setItem("token", a?.token);
    } else {
      await AsyncStorage.removeItem("token");
    }
    setInternalAuthUser(a);
  };

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(token => {
        setExpoPushToken(token);
      });
  }, []);

  // useEffect(() => {
  //   authService.me()
  //     .then((authU) => setAuthUser(authU))
  //     .catch(() => console.log("Token expired"));
  // }, []);

  const {children} = props;

  return (
    <AppContext.Provider
      value={{
        expoPushToken,
        authUser,
        setAuthUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
