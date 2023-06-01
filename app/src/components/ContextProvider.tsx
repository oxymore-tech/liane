import React, { Component, createContext, ReactNode } from "react";
import { AuthUser, LatLng, LocationPermissionLevel, UnionUtils, User } from "@/api";
import { getLastKnownLocation } from "@/api/location";
import { AppServices, CreateAppServices } from "@/api/service";
import { NetworkUnavailable, UnauthorizedError } from "@/api/exception";
import { initializeRum, registerRumUser } from "@/api/rum";
import { initializeNotification, initializePushNotification } from "@/api/service/notification";
import { ActivityIndicator, AppState, AppStateStatus, NativeEventSubscription, Platform, StyleSheet, View } from "react-native";
import { AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { RootNavigation } from "@/api/navigation";
import { MemberAccepted, MemberHasLeft, MemberRejected } from "@/api/event";
import { QueryClient } from "react-query";
import { JoinRequestsQueryKey, LianeQueryKey } from "@/screens/user/MyTripsScreen";

interface AppContextProps {
  locationPermission: LocationPermissionLevel;
  setLocationPermission: (locationPermissionGranted: LocationPermissionLevel) => void;
  position?: LatLng;
  user?: User;
  setAuthUser: (authUser?: AuthUser) => void;
  services: AppServices;
  status: "online" | "offline";
  appState: AppStateStatus;
}

const SERVICES = CreateAppServices();

export const AppContext = createContext<AppContextProps>({
  locationPermission: LocationPermissionLevel.NEVER,
  setLocationPermission: () => {},
  setAuthUser: () => {},
  services: SERVICES,
  status: "offline",
  appState: "active"
});

async function initContext(service: AppServices): Promise<{
  user: User | undefined;
  locationPermission: LocationPermissionLevel;
  position: LatLng;
  online: boolean;
}> {
  // await SplashScreen.preventAutoHideAsync();
  let authUser = await service.auth.authUser();

  let user;
  let online = true;
  //let notificationSubscription = undefined;
  if (!__DEV__) {
    await initializeRum();
  }

  await initializeNotification();

  if (authUser?.isSignedUp) {
    try {
      user = await service.chatHub.start();
      // Branch hub to notifications
      service.notification.initUnreadNotificationCount(service.chatHub.unreadNotificationCount);
    } catch (e) {
      if (__DEV__) {
        console.log("Could not start hub :", e);
      }
      if (e instanceof UnauthorizedError) {
      } else if (e instanceof NetworkUnavailable) {
        console.log("Error : no network");
        //user = cached value for an offline mode
        user = await service.auth.currentUser();
        online = false;
      }
    }
  }

  if (online && user) {
    try {
      if (Platform.OS === "android") {
        await initializePushNotification(user, service.auth);
      }
    } catch (e) {
      if (__DEV__) {
        console.log("Could not init notifications :", e);
      }
    }
  }

  const locationPermission = LocationPermissionLevel.NEVER;
  const position = await getLastKnownLocation();
  await service.notification.checkInitialNotification();

  return { user, locationPermission, position, online };
}

async function destroyContext(service: AppServices): Promise<void> {
  await service.chatHub.stop();
}

interface ContextProviderProps {
  children: ReactNode;
}

interface ContextProviderState {
  appLoaded: boolean;
  locationPermission: LocationPermissionLevel;
  position?: LatLng;
  user?: User;
  status: "online" | "offline";
  appState: AppStateStatus;
}

class ContextProvider extends Component<ContextProviderProps, ContextProviderState> {
  private unsubscribeToUserInteraction: (() => void) | undefined = undefined;
  private unsubscribeToStateChange: NativeEventSubscription | undefined = undefined;
  constructor(props: ContextProviderProps) {
    super(props);
    this.state = {
      locationPermission: LocationPermissionLevel.NEVER,
      appLoaded: false,
      position: undefined,
      user: undefined,
      status: "offline",
      appState: "active"
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  private initContext() {
    initContext(SERVICES).then(async p => {
      this.setState(prev => ({
        ...prev,
        user: p.user,
        locationPermission: p.locationPermission,
        position: p.position,
        appLoaded: true,
        status: p.online ? "online" : "offline"
      }));
      if (p.online && p.user) {
        SERVICES.chatHub.subscribeToNotifications(async n => {
          console.debug("dbg", SERVICES.notification.receiveNotification.call);
          await SERVICES.notification.receiveNotification(n, this.state.appState !== "active");
        });
      }
    });
  }

  private handleAppStateChange = (appState: AppStateStatus) => {
    this.setState(prev => ({
      ...prev,
      appState: appState
    }));
  };

  componentDidMount() {
    this.initContext();
    this.unsubscribeToUserInteraction = RootNavigation.addListener("state", _ => {
      // Try to reload on user interaction
      if (this.state.status === "offline") {
        console.debug("Try to reload...");
        this.initContext();
      }
    });
    this.unsubscribeToStateChange = AppState.addEventListener("change", this.handleAppStateChange);
  }

  componentWillUnmount() {
    if (this.unsubscribeToUserInteraction) {
      this.unsubscribeToUserInteraction();
    }
    if (this.unsubscribeToStateChange) {
      this.unsubscribeToStateChange.remove();
    }
    destroyContext(SERVICES).catch(err => console.debug("Error destroying context:", err));
  }

  componentDidCatch(error: any) {
    if (error instanceof UnauthorizedError) {
      this.setState(prev => ({
        ...prev,
        user: undefined
      }));
    } else if (error instanceof NetworkUnavailable) {
      console.log("Error : no network");

      this.setState(prev => ({
        ...prev,
        status: "offline"
      }));
    } else {
      console.error("Error :", error);
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
    const { appLoaded, locationPermission, position, user, status, appState } = this.state;
    const { setLocationPermission, setAuthUser } = this;

    if (!appLoaded) {
      return (
        <View style={styles.page}>
          <ActivityIndicator />
        </View>
      );
    } else if (status !== "online" && !user) {
      return (
        <View style={styles.page}>
          <AppText style={{ color: AppColors.white }}>Erreur: réseau indisponible</AppText>
        </View>
      );
    }

    return (
      <AppContext.Provider
        value={{
          locationPermission,
          setLocationPermission,
          setAuthUser,
          position,
          user,
          status,
          appState,
          services: SERVICES
        }}>
        {children}
      </AppContext.Provider>
    );
  }
}

export default ContextProvider;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: AppColors.darkBlue,
    alignItems: "center",
    justifyContent: "center"
  }
});
