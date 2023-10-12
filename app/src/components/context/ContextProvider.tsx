import React, { Component, createContext, ReactNode } from "react";
import { AuthUser, FullUser, LatLng } from "@/api";
import { AppServices, CreateAppServices } from "@/api/service";
import { NetworkUnavailable, UnauthorizedError } from "@/api/exception";
import { initializeRum, registerRumUser } from "@/api/rum";
import { initializeNotification, initializePushNotification } from "@/api/service/notification";
import { ActivityIndicator, AppState, AppStateStatus, NativeEventSubscription, StyleSheet, View } from "react-native";
import { AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import NetInfo, { NetInfoSubscription } from "@react-native-community/netinfo";
import Splashscreen from "../../../native-modules/splashscreen";
import { SubscriptionLike } from "rxjs";
import { HubState } from "@/api/service/interfaces/hub";
import { QueryClient, QueryClientProvider } from "react-query";
import { AppLogger } from "@/api/logger";

interface AppContextProps {
  position?: LatLng;
  user?: FullUser;
  logout: () => void;
  reconnect: () => void;
  login: (user: AuthUser) => void;
  services: AppServices;
  status: HubState;
  appState: AppStateStatus;
}

const SERVICES = CreateAppServices();
const queryClient = new QueryClient();

export const AppContext = createContext<AppContextProps>({
  logout: () => {},
  login: () => {},
  reconnect: () => {},
  services: SERVICES,
  status: "offline",
  appState: "active"
});

async function initContext(service: AppServices): Promise<{
  user: FullUser | undefined;
  online: boolean;
}> {
  let authUser = await service.auth.authUser();
  let user;
  let online = true;

  await initializeRum();

  if (authUser) {
    await initializeNotification();
  }

  if (authUser?.isSignedUp) {
    try {
      user = await service.realTimeHub.start();
      // Branch hub to notifications
      service.notification.initUnreadNotificationCount(service.realTimeHub.unreadNotificationCount);
    } catch (e) {
      AppLogger.warn("INIT", "Could not start hub :", e);

      if (e instanceof UnauthorizedError) {
      } else if (e instanceof NetworkUnavailable) {
        AppLogger.warn("INIT", "Error : no network");
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
      AppLogger.warn("INIT", "Could not init notifications :", e);
    }
  }

  return { user, online };
}

async function destroyContext(service: AppServices): Promise<void> {
  await service.realTimeHub.stop();
}

interface ContextProviderProps {
  children: ReactNode;
}

interface ContextProviderState {
  appLoaded: boolean;
  user?: FullUser;
  status: "online" | "offline";
  appState: AppStateStatus;
  hubState: HubState;
}

class ContextProvider extends Component<ContextProviderProps, ContextProviderState> {
  private unsubscribeToUserInteraction: (() => void) | undefined = undefined;
  private unsubscribeToStateChange: NativeEventSubscription | undefined = undefined;
  private unsubscribeToNetworkChange: NetInfoSubscription | undefined = undefined;
  private unsubscribeToHubState: SubscriptionLike | undefined = undefined;
  private userChangeSubscription: SubscriptionLike | undefined = undefined;
  private notificationSubscription: SubscriptionLike | undefined = undefined;

  constructor(props: ContextProviderProps) {
    super(props);
    this.state = {
      appLoaded: false,
      user: undefined,
      status: "offline",
      appState: "active",
      hubState: "offline"
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  private async initContext() {
    const info = await initContext(SERVICES);
    const status = info.online ? "online" : "offline";
    this.setState(prev => ({
      ...prev,
      user: info.user,
      appLoaded: true,
      status,
      hubState: status
    }));
    if (info.online && info.user) {
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
  }

  private handleAppStateChange = (appState: AppStateStatus) => {
    SERVICES.realTimeHub.updateActiveState(appState === "active");
    this.setState(prev => ({
      ...prev,
      appState: appState
    }));
  };

  private reconnecting = false;
  private forceReconnect() {
    if (this.reconnecting) {
      return;
    }
    this.reconnecting = true;
    AppLogger.debug("INIT", "Try to reload...");
    this.initContext()
      .then(() => queryClient.invalidateQueries())
      .finally(() => {
        this.reconnecting = false;
      });
  }

  componentDidMount() {
    this.initContext().then();

    this.unsubscribeToHubState = SERVICES.realTimeHub.hubState.subscribe(status => {
      this.setState(prev => ({
        ...prev,
        hubState: status
      }));
    });

    this.unsubscribeToNetworkChange = NetInfo.addEventListener(state => {
      const wasOffline = this.state.status === "offline";
      const isJustReconnected = state.isInternetReachable === true && wasOffline && !!this.state.user;
      if (isJustReconnected) {
        this.forceReconnect();
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
    if (this.unsubscribeToHubState) {
      this.unsubscribeToHubState.unsubscribe();
    }
    if (this.userChangeSubscription) {
      this.userChangeSubscription.unsubscribe();
    }
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    destroyContext(SERVICES).catch(err => AppLogger.warn("INIT", "Error destroying context:", err));
  }

  componentDidCatch(error: any) {
    if (error instanceof UnauthorizedError) {
      this.setState(prev => ({
        ...prev,
        user: undefined
      }));
    } else if (error instanceof NetworkUnavailable) {
      AppLogger.warn("INIT", "Error : no network");

      this.setState(prev => ({
        ...prev,
        status: "offline"
      }));
    } else {
      AppLogger.error("INIT", error);
    }
  }

  setAuthUser = async (a?: AuthUser) => {
    try {
      let user: FullUser;
      if (a) {
        await registerRumUser(a);
        user = await SERVICES.realTimeHub.start();
        AppLogger.debug("LOGIN", user);
      }
      this.setState(prev => ({
        ...prev,
        user: user
      }));
    } catch (e) {
      AppLogger.error("INIT", "Problem while setting auth user : ", e);
    }
  };
  logout = async () => {
    // do not call "logout" endpoint here as this could be used after account deletion, account switch, etc.
    await SERVICES.realTimeHub.stop();
    AppLogger.info("LOGOUT", "Disconnected.");
    queryClient.clear();
    await this.setAuthUser(undefined);
  };
  render() {
    const { children } = this.props;
    const { appLoaded, user, status, appState } = this.state;
    const { setAuthUser: login, logout } = this;

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
      <QueryClientProvider client={queryClient}>
        <AppContext.Provider
          value={{
            logout,
            login,
            reconnect: this.state.hubState === "offline" ? this.forceReconnect : () => {},
            user,
            status: this.state.hubState,
            appState,
            services: SERVICES
          }}>
          {children}
        </AppContext.Provider>
      </QueryClientProvider>
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
