import React, { Component, createContext, ReactNode } from "react";
import { AuthUser, FullUser, LatLng, LocationPermissionLevel } from "@/api";
import { getLastKnownLocation } from "@/api/location";
import { AppServices, CreateAppServices } from "@/api/service";
import { NetworkUnavailable, UnauthorizedError } from "@/api/exception";
import { initializeRum, registerRumUser } from "@/api/rum";
import { initializeNotification, initializePushNotification } from "@/api/service/notification";
import { ActivityIndicator, AppState, AppStateStatus, NativeEventSubscription, StyleSheet, View } from "react-native";
import { AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { RootNavigation } from "@/api/navigation";
import NetInfo, { NetInfoSubscription } from "@react-native-community/netinfo";
import Splashscreen from "../../../native-modules/splashscreen";
import { SubscriptionLike } from "rxjs";

interface AppContextProps {
  locationPermission: LocationPermissionLevel;
  setLocationPermission: (locationPermissionGranted: LocationPermissionLevel) => void;
  position?: LatLng;
  user?: FullUser;
  logout: () => void;
  login: (user: AuthUser) => void;
  services: AppServices;
  status: "online" | "offline";
  appState: AppStateStatus;
}

const SERVICES = CreateAppServices();

export const AppContext = createContext<AppContextProps>({
  locationPermission: LocationPermissionLevel.NEVER,
  setLocationPermission: () => {},
  logout: () => {},
  login: () => {},
  services: SERVICES,
  status: "offline",
  appState: "active"
});

async function initContext(service: AppServices): Promise<{
  user: FullUser | undefined;
  locationPermission: LocationPermissionLevel;
  position: LatLng;
  online: boolean;
}> {
  let authUser = await service.auth.authUser();

  let user;
  let online = true;

  if (!__DEV__) {
    await initializeRum();
  }

  if (authUser) {
    await initializeNotification();
  }

  if (authUser?.isSignedUp) {
    try {
      user = await service.realTimeHub.start();
      // Branch hub to notifications
      service.notification.initUnreadNotificationCount(service.realTimeHub.unreadNotificationCount);
    } catch (e) {
      if (__DEV__) {
        console.warn("[INIT] Could not start hub :", e);
      }
      if (e instanceof UnauthorizedError) {
      } else if (e instanceof NetworkUnavailable) {
        console.warn("[INIT] Error : no network");
        //user = cached value for an offline mode
        user = await service.auth.currentUser();
        online = false;
      }
    }
  }

  if (online && user) {
    try {
      await initializePushNotification(user, service.auth);
    } catch (e) {
      console.warn("[INIT] Could not init notifications :", e);
    }
  }

  const locationPermission = LocationPermissionLevel.NEVER;
  const position = await getLastKnownLocation();

  return { user, locationPermission, position, online };
}

async function destroyContext(service: AppServices): Promise<void> {
  await service.realTimeHub.stop();
}

interface ContextProviderProps {
  children: ReactNode;
}

interface ContextProviderState {
  appLoaded: boolean;
  locationPermission: LocationPermissionLevel;
  position?: LatLng;
  user?: FullUser;
  status: "online" | "offline";
  appState: AppStateStatus;
}

class ContextProvider extends Component<ContextProviderProps, ContextProviderState> {
  private unsubscribeToUserInteraction: (() => void) | undefined = undefined;
  private unsubscribeToStateChange: NativeEventSubscription | undefined = undefined;
  private unsubscribeToNetworkChange: NetInfoSubscription | undefined = undefined;
  private userChangeSubscription: SubscriptionLike | undefined = undefined;
  private notificationSubscription: SubscriptionLike | undefined = undefined;
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
        this.notificationSubscription = SERVICES.realTimeHub.subscribeToNotifications(async n => {
          //console.debug("dbg ------>", this.state.appState);
          await SERVICES.notification.receiveNotification(n, false); // does nothing if this.state.appState !== "active");
        });
        this.userChangeSubscription = SERVICES.auth.subscribeToUserChanges(user => {
          this.setState(prev => ({
            ...prev,
            user
          }));
        });
      }

      Splashscreen.hide();
    });
  }

  private handleAppStateChange = (appState: AppStateStatus) => {
    SERVICES.realTimeHub.updateActiveState(appState === "active");
    this.setState(prev => ({
      ...prev,
      appState: appState
    }));
  };

  componentDidMount() {
    this.initContext();
    this.unsubscribeToNetworkChange = NetInfo.addEventListener(state => {
      this.setState(prev => ({
        ...prev,
        status: state.isConnected ? "online" : "offline"
      }));
    });
    this.unsubscribeToUserInteraction = RootNavigation.addListener("state", _ => {
      // Try to reload on user interaction
      if (this.state.status === "offline") {
        console.debug("[INIT] Try to reload...");
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
    if (this.unsubscribeToNetworkChange) {
      this.unsubscribeToNetworkChange();
    }
    if (this.userChangeSubscription) {
      this.userChangeSubscription.unsubscribe();
    }
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
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
      console.warn("[INIT] Error : no network");

      this.setState(prev => ({
        ...prev,
        status: "offline"
      }));
    } else {
      console.error("[INIT] Error :", error);
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
      let user: FullUser;
      if (a) {
        await registerRumUser(a);
        user = await SERVICES.realTimeHub.start();
      }
      this.setState(prev => ({
        ...prev,
        user: user
      }));
    } catch (e) {
      console.error("[INIT] Problem while setting auth user : ", e);
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

    const logout = async () => {
      await SERVICES.realTimeHub.stop();
      await SERVICES.auth.logout();
      console.debug("[LOGOUT] Disconnected.");
      await setAuthUser(undefined);
    };

    const login = setAuthUser;

    return (
      <AppContext.Provider
        value={{
          locationPermission,
          setLocationPermission,
          logout,
          login,
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
