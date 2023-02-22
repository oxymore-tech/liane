import React, { Component, createContext, ReactNode } from "react";
import { AuthUser, LatLng, LocationPermissionLevel, User } from "@/api";
import { getLastKnownLocation } from "@/api/location";
import { AppServices, CreateAppServices } from "@/api/service";
import { UnauthorizedError } from "@/api/exception";
import { initializeRum, registerRumUser } from "@/api/rum";
import { initializeNotification } from "@/api/service/notification";
import { View } from "react-native";
import { AppColors } from "@/theme/colors";

interface AppContextProps {
  locationPermission: LocationPermissionLevel;
  setLocationPermission: (locationPermissionGranted: LocationPermissionLevel) => void;
  position?: LatLng;
  user?: User;
  setAuthUser: (authUser?: AuthUser) => void;
  services: AppServices;
}

const SERVICES = CreateAppServices();

export const AppContext = createContext<AppContextProps>({
  locationPermission: LocationPermissionLevel.NEVER,
  setLocationPermission: () => {},
  setAuthUser: () => {},
  services: SERVICES
});

async function initContext(service: AppServices): Promise<{
  user: User | undefined;
  locationPermission: LocationPermissionLevel;
  position: LatLng;
}> {
  // await SplashScreen.preventAutoHideAsync();
  const authUser = await service.auth.authUser();
  let user;

  if (authUser) {
    try {
      user = await SERVICES.chatHub.start();
    } catch (e) {
      if (__DEV__) {
        console.log("Could not start hub :", e);
      }
      //TODO user = cached value for an offline mode
    }
  }

  if (!__DEV__) {
    await initializeNotification();
    await initializeRum();
  }
  const locationPermission = LocationPermissionLevel.NEVER;
  const position = await getLastKnownLocation();
  return { user, locationPermission, position };
}

interface ContextProviderProps {
  children: ReactNode;
}

interface ContextProviderState {
  appLoaded: boolean;
  locationPermission: LocationPermissionLevel;
  position?: LatLng;
  user?: User;
}

class ContextProvider extends Component<ContextProviderProps, ContextProviderState> {
  constructor(props: ContextProviderProps) {
    super(props);
    this.state = {
      locationPermission: LocationPermissionLevel.NEVER,
      appLoaded: false,
      position: undefined,
      user: undefined
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidMount() {
    initContext(SERVICES).then(async p =>
      this.setState(prev => ({
        ...prev,
        user: p.user,
        locationPermission: p.locationPermission,
        position: p.position,
        appLoaded: true
      }))
    );
  }

  componentDidCatch(error: any) {
    if (error instanceof UnauthorizedError) {
      this.setState(prev => ({
        ...prev,
        user: undefined
      }));
    }
  }

  setLocationPermission = (locationPermissionGranted: LocationPermissionLevel) => {
    this.setState(prev => ({
      ...prev,
      locationPermission: locationPermissionGranted
    }));
  };

  setAuthUser = async (a?: AuthUser) => {
    try {
      let user: User;
      if (a) {
        await registerRumUser(a);
        user = await SERVICES.chatHub.start();
      }
      this.setState(prev => ({
        ...prev,
        user: user
      }));
    } catch (e) {
      console.error("Problem while setting auth user : ", e);
    }
  };

  render() {
    const { children } = this.props;
    const { appLoaded, locationPermission, position, user } = this.state;
    const { setLocationPermission, setAuthUser } = this;

    // TODO handle loading view
    return appLoaded ? (
      <AppContext.Provider
        value={{
          locationPermission,
          setLocationPermission,
          setAuthUser,
          position,
          user,
          services: SERVICES
        }}>
        {children}
      </AppContext.Provider>
    ) : (
      <View style={{ flex: 1, backgroundColor: AppColors.darkBlue, alignItems: "center", justifyContent: "center" }} />
    );
  }
}

export default ContextProvider;
