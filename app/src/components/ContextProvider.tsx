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
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import { me } from "@/api/client";
import { getLastKnownLocation } from "@/api/location";
import { AuthUser, LatLng, LocationPermissionLevel } from "@/api";
import { getStoredToken } from "@/api/storage";
import { registerRum, registerRumUser } from "@/api/rum";

interface AppContextProps {
  appLoaded: boolean;
  locationPermission: LocationPermissionLevel;
  setLocationPermission: (locationPermissionGranted: LocationPermissionLevel) => void;
  position?: LatLng;
  authUser?: AuthUser;
  setAuthUser: (authUser?: AuthUser) => void;
}

export const AppContext = createContext<AppContextProps>({
  appLoaded: false,
  locationPermission: LocationPermissionLevel.NEVER,
  setLocationPermission: () => { },
  setAuthUser: () => { }
});

async function initContext(): Promise<{ authUser?:AuthUser, locationPermission:LocationPermissionLevel, position:LatLng }> {
  await SplashScreen.preventAutoHideAsync();
  const storedToken = await getStoredToken();
  const authUser = storedToken ? await me().catch(() => undefined) : undefined;

  console.log(`Authenticated user is ${JSON.stringify(authUser)}`);

  await registerRum();

  const locationPermission = LocationPermissionLevel.NEVER;
  const position = await getLastKnownLocation();
  return { authUser, locationPermission, position };
}

function ContextProvider(props: { children: ReactNode }) {
  const [fontLoaded] = useFonts({
    Inter_ExtraLight: Inter_200ExtraLight,
    Inter: Inter_400Regular,
    Inter_Medium: Inter_500Medium,
    Inter_SemiBold: Inter_600SemiBold,
    Inter_Bold: Inter_700Bold
  });

  const [appLoaded, setAppLoaded] = useState(false);
  const [locationPermission, setLocationPermission] = useState(LocationPermissionLevel.NEVER);
  const [position, setPosition] = useState<LatLng>();
  const [authUser, setInternalAuthUser] = useState<AuthUser>();

  const setAuthUser = async (a?: AuthUser) => {
    try {
      if (a) {
        const token = a?.token;
        console.log("storeToken", a?.token);
        await AsyncStorage.setItem("token", token);
        await registerRumUser(a);
      } else {
        await AsyncStorage.removeItem("token");
      }
      setInternalAuthUser(a);
    } catch (e) {
      console.log("Problem while setting auth user : ", e);
    }
  };

  useEffect(() => {
    initContext()
      .then((p) => {
        setPosition(p.position);
        setLocationPermission(p.locationPermission);
        setAuthUser(p.authUser).then(() => setAppLoaded(true));
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
          locationPermission,
          setLocationPermission,
          position,
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
