import React, { Component, createContext, ReactNode } from "react";
import { View } from "react-native";
import { AuthUser, LatLng, LocationPermissionLevel } from "@/api";
import { initializeRum, registerRumUser } from "@/api/rum";
import { getLastKnownLocation } from "@/api/location";
import { AppServices, CreateAppServices } from "@/api/service";
import { UnauthorizedError } from "@/api/exception";

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
  setAuthUser: () => {},
  services: SERVICES
});

async function initContext(service: AppServices): Promise<{ authUser: AuthUser | undefined, locationPermission: LocationPermissionLevel, position: LatLng }> {
  // await SplashScreen.preventAutoHideAsync();

  const authUser = await service.auth.me();

  await initializeRum();
  const locationPermission = LocationPermissionLevel.NEVER;
  const position = await getLastKnownLocation();
  return { authUser, locationPermission, position };
}

interface ContextProviderProps {
  children: ReactNode;
}

interface ContextProviderState {
  appLoaded: boolean;
  locationPermission :LocationPermissionLevel;
  position?: LatLng;
  authUser? : AuthUser;
}

class ContextProvider extends Component<ContextProviderProps, ContextProviderState> {

  constructor(props: ContextProviderProps) {
    super(props);
    this.state = { locationPermission: LocationPermissionLevel.NEVER, appLoaded: false, position: undefined, authUser: undefined };
  }

  componentDidCatch(error: any, info: any) {
    if (error instanceof UnauthorizedError) {
      this.setState((prev) => ({
        ...prev, authUser: undefined
      }));
    }
  }

  setLocationPermission = (locationPermissionGranted: LocationPermissionLevel) => {
    this.setState((prev) => ({
      ...prev, locationPermission: locationPermissionGranted
    }));
  }

   setAuthUser = async (a?: AuthUser) => {
     try {
       if (a) {
         await registerRumUser(a);
       }
       this.setState((prev) => ({
         ...prev, authUser: a
       }));
     } catch (e) {
       console.log("Problem while setting auth user : ", e);
     }
   };

   render() {
     const { children } = this.props;
     const { appLoaded, locationPermission, position, authUser } = this.state;
     const { setLocationPermission, setAuthUser } = this;
     const service = SERVICES;

     initContext(service)
       .then(async (p) => this.setState((prev) => ({
         ...prev, locationPermission: p.locationPermission, position: p.position, appLoaded: true
       })));

     return (
       <View style={{ flex: 1 }}>
         <AppContext.Provider
           value={{
             appLoaded,
             locationPermission,
             setLocationPermission,
             setAuthUser,
             position,
             authUser,
             services: service
           }}
         >
           {children}
         </AppContext.Provider>
       </View>
     );
   }

}

export default ContextProvider;
