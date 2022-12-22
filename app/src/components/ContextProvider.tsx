import React, {
  createContext, ReactNode, useCallback, useEffect, useState
} from "react";
import { View } from "react-native";
import { AuthResponse, AuthUser, LatLng, LocationPermissionLevel } from "@/api";
import { me } from "@/api/client";
import { registerRum, registerRumUser } from "@/api/rum";
import { getLastKnownLocation } from "@/api/location";
import { getStoredToken, setStoredToken } from "@/api/storage";

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
  setLocationPermission: () => {
  },
  setAuthUser: () => {
  }
});

async function initContext(): Promise<{ authResponse?: AuthResponse, locationPermission: LocationPermissionLevel, position: LatLng }> {
  // await SplashScreen.preventAutoHideAsync();
  const storedToken = await getStoredToken();

  const authResponse = storedToken ? await me().catch((e) => console.log(e)) : undefined;
  if (storedToken) {
    if (authResponse) {
      console.info(`Token found in asyncstorage, user is ${JSON.stringify(authResponse)}`);
    } else {
      console.info("Token found in asyncstorage, but it is no longer valid", storedToken);
    }
  }

  await registerRum();

  const locationPermission = LocationPermissionLevel.NEVER;
  const position = await getLastKnownLocation();
  return { authResponse, locationPermission, position };
}

function ContextProvider(props: { children: ReactNode }) {
//  const [fontLoaded] = useFonts();

  const [appLoaded, setAppLoaded] = useState(false);
  const [locationPermission, setLocationPermission] = useState(LocationPermissionLevel.NEVER);
  const [position, setPosition] = useState<LatLng>();
  const [authUser, setInternalAuthUser] = useState<AuthUser>();

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

  useEffect(() => {
    initContext()
      .then(async (p) => {
        await setPosition(p.position);
        await setLocationPermission(p.locationPermission);
        await setStoredToken(p.authResponse?.token);
        await setAuthUser(p.authResponse?.user);
      })
      .then(() => setAppLoaded(true));
  }, []);

  const { children } = props;

  const onLayoutRootView = useCallback(async () => {
    if (appLoaded) { // && fontLoaded) {
      // If called after `setAppLoaded`, we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels.
      // So instead, we hide the splash screen once we know the root view has already
      // performed layout.
      // TODO await SplashScreen.hideAsync();
    }
  }, [appLoaded, undefined]);

  if (!(appLoaded)) { // &&fontLoaded)) {
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
          setAuthUser
        }}
      >
        {children}
      </AppContext.Provider>
    </View>
  );
}

export default ContextProvider;
