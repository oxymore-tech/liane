import React, { createContext, ReactNode, useCallback, useState } from "react";
import { View } from "react-native";
import { useQuery } from "react-query";
import { AuthUser, LatLng, LocationPermissionLevel } from "@/api";
import { registerRum, registerRumUser } from "@/api/rum";
import { getLastKnownLocation } from "@/api/location";
import { AppServices, CreateAppServices } from "@/api/service";

interface AppContextProps {
  appLoaded: boolean;
  locationPermission: LocationPermissionLevel;
  setLocationPermission: (locationPermissionGranted: LocationPermissionLevel) => void;
  position?: LatLng;
  authUser?: AuthUser;
  setAuthUser: (authUser?: AuthUser) => void;
  services: AppServices;
}

const SERVICES = CreateAppServices();

export const AppContext = createContext<AppContextProps>({
  appLoaded: false,
  locationPermission: LocationPermissionLevel.NEVER,
  setLocationPermission: () => {
  },
  setAuthUser: () => {
  },
  services: SERVICES
});

async function initContext(service: AppServices): Promise<{ authUser?: AuthUser, locationPermission: LocationPermissionLevel, position: LatLng }> {
  // await SplashScreen.preventAutoHideAsync();

  const authUser = await service.auth.me();

  await registerRum();
  const locationPermission = LocationPermissionLevel.NEVER;
  const position = await getLastKnownLocation();
  return { authUser, locationPermission, position };
}

function ContextProvider(props: { children: ReactNode }) {

  const { children } = props;

  const [appLoaded, setAppLoaded] = useState(false);
  const [locationPermission, setLocationPermission] = useState(LocationPermissionLevel.NEVER);
  const [position, setPosition] = useState<LatLng>();
  const [authUser, setInternalAuthUser] = useState<AuthUser>();
  const service = SERVICES;

  const setAuthUser = async (a?: AuthUser) => {
    try {
      if (a) {
        await registerRumUser(a);
      }
      setInternalAuthUser(a);
    } catch (e) {
      console.log("Problem while setting auth user : ", e);
    }
  };

  const { isLoading, error, data } = useQuery("init", () => initContext(service)
    .then(async (p) => {
      await setPosition(p.position);
      await setLocationPermission(p.locationPermission);
      await setAuthUser(p.authUser);
    })
    .then(() => setAppLoaded(true)));

  const onLayoutRootView = useCallback(async () => {
    if (appLoaded) {
      // If called after `setAppLoaded`, we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels.
      // So instead, we hide the splash screen once we know the root view has already
      // performed layout.
      // TODO await SplashScreen.hideAsync();
    }
  }, [appLoaded, undefined]);

  if (!(appLoaded)) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AppContext.Provider
        value={{
          appLoaded, // && fontLoaded,
          locationPermission,
          setLocationPermission,
          position,
          authUser,
          setAuthUser,
          services: service
        }}
      >
        {children}
      </AppContext.Provider>
    </View>
  );
}

export default ContextProvider;
