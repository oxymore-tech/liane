import React, { Component, createContext, ReactNode } from "react";
import { AppServices, CreateAppServices } from "@/api/service";
import { AuthUser, FullUser, HubState, LatLng, NetworkUnavailable, UnauthorizedError } from "@liane/common";
import { initializeRum, registerRumUser } from "@/api/rum";
import { displayNotifeeNotification, initializeNotification, initializePushNotification } from "@/api/service/notification";
import { ActivityIndicator, AppState, AppStateStatus, NativeEventSubscription, StyleSheet, View } from "react-native";
import { AppColors } from "@/theme/colors";
import NetInfo, { NetInfoSubscription } from "@react-native-community/netinfo";
import Splashscreen from "../../../native-modules/splashscreen";
import { SubscriptionLike } from "rxjs";
import { QueryClient, QueryClientProvider } from "react-query";
import { QueryUpdateProvider } from "@/components/context/QueryUpdateProvider";
import { AppLogger } from "@/api/logger";
import { AppStorage } from "@/api/storage";

interface AppContextProps {
  position?: LatLng;
  user?: FullUser;
  logout: () => void;
  login: (user?: AuthUser) => void;
  refreshUser: () => Promise<void>;
  services: AppServices;
  status: HubState;
  appState: AppStateStatus;
  hubState?: HubState;
}

let SERVICES = CreateAppServices();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

export const AppContext = createContext<AppContextProps>({
  logout: () => {},
  login: () => {},
  refreshUser: () => Promise.resolve(),
  services: SERVICES,
  status: "offline",
  appState: "active"
});

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
  hubState?: HubState;
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
      appState: "active"
    };
    // https://stackoverflow.com/questions/33973648/react-this-is-undefined-inside-a-component-function
    this.initContext = this.initContext.bind(this);
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  private async initContext() {
    await initializeRum();

    await initializeNotification();

    let user = await AppStorage.getUser();
    if (user) {
      await registerRumUser(user);
      await initializePushNotification(user, SERVICES.auth);
      await SERVICES.realTimeHub.start();
    }

    this.setState(prev => ({
      ...prev,
      user,
      appLoaded: true
    }));
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
    queryClient
      .invalidateQueries()
      .then(() => SERVICES.realTimeHub.start())
      .finally(() => {
        this.reconnecting = false;
      });
  }

  componentDidMount() {
    this.notificationSubscription = SERVICES.realTimeHub.subscribeToNotifications(async n => {
      await SERVICES.notification.receiveNotification(n); // does nothing if this.state.appState !== "active"); -> TODO disconnect from hub when app is not active
      await displayNotifeeNotification(n);
    });

    this.userChangeSubscription = SERVICES.realTimeHub.userUpdates.subscribe(async u => {
      await registerRumUser({ ...u });
      await initializePushNotification(u, SERVICES.auth);
      this.setState(prev => ({
        ...prev,
        user: u
      }));
    });

    this.unsubscribeToHubState = SERVICES.realTimeHub.hubState.subscribe(status => {
      this.setState(prev => ({
        ...prev,
        status: status === "offline" ? "offline" : "online",
        hubState: status
      }));
    });

    this.unsubscribeToNetworkChange = NetInfo.addEventListener(async state => {
      const wasOffline = this.state.status === "offline";
      const isJustReconnected = state.isInternetReachable === true && wasOffline && !!this.state.user;
      if (isJustReconnected) {
        this.forceReconnect();
      }
    });
    this.unsubscribeToStateChange = AppState.addEventListener("change", this.handleAppStateChange);

    this.initContext().then();
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
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    if (this.userChangeSubscription) {
      this.userChangeSubscription.unsubscribe();
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

  refreshUser = async () => {
    // Just sync with storage
    const user = await AppStorage.getUser();
    this.setState(prev => ({
      ...prev,
      user
    }));
  };

  setAuthUser = async (a?: AuthUser) => {
    await AppStorage.storeSession(a);
    if (a) {
      AppLogger.debug("LOGIN", "Login successfully");
      const user = await SERVICES.auth.me();
      await SERVICES.realTimeHub.start();
      this.setState(prev => ({
        ...prev,
        user
      }));
    } else {
      await AppStorage.storeUser(undefined);
      this.setState(prev => ({
        ...prev,
        user: undefined
      }));
    }
  };

  logout = async () => {
    // do not call "logout" endpoint here as this could be used after account deletion, account switch, etc.
    queryClient.clear();
    await destroyContext(SERVICES);
    AppLogger.info("LOGOUT", "Disconnected.");
    await this.setAuthUser(undefined);
  };

  render() {
    const { children } = this.props;
    const { appLoaded, user, status, appState, hubState } = this.state;
    const { setAuthUser: login, logout, refreshUser } = this;

    if (!appLoaded) {
      return (
        <View style={styles.page}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <QueryClientProvider client={queryClient}>
        <QueryUpdateProvider>
          <AppContext.Provider
            value={{
              logout,
              login,
              refreshUser,
              user,
              status,
              hubState,
              appState,
              services: SERVICES
            }}>
            {children}
          </AppContext.Provider>
        </QueryUpdateProvider>
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
