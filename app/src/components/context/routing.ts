import {
  createNavigationContainerRef,
  LinkingOptions,
  NavigationContainerRefWithCurrent,
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { JoinRequestDetailed, Trip, Event, Notification, JoinRequest, User, UnionUtils } from "@liane/common";
import { NativeStackNavigationProp } from "@react-navigation/native-stack/src/types";
import { InternalLianeRequest } from "@/screens/publish/StateMachine";
import { checkInitialNotification } from "@/api/service/notification";

export const HOME_TRIPS = "Mes trajets";
export type NavigationParamList = {
  Home: undefined;
  [HOME_TRIPS]: undefined;
  Publish: { initialValue?: Partial<InternalLianeRequest> };
  SignUp: undefined;
  RequestJoin: { request: JoinRequestDetailed };
  JoinRequestDetail: { request: JoinRequestDetailed | string };
  Chat: { conversationId: string; trip?: Trip };
  TripDetail: { trip: Trip | string };
  Profile: { user: User } | undefined;
  ProfileEdit: undefined;
  Account: undefined;
  OpenJoinRequest: { request: Event<JoinRequest> };
  TripGeolocationWizard: { showAs: "driver" | "passenger" | undefined | null; tripId: string | undefined } | undefined;
  ArchivedTrips: undefined;
  Settings: undefined;
  //OpenValidateTrip: { trip: Trip };
  Notifications: undefined;
  RallyingPointRequests: undefined;
};

export const NavigationScreenTitles = {
  Publish: "Créer une Trip",
  Account: "Mon compte",
  ArchivedTrips: "Historique des trajets",
  Settings: "Paramètres",
  Notifications: "Notifications"
};

export const AppLinking: LinkingOptions<NavigationParamList> = {
  prefixes: ["liane://"],
  getInitialURL: checkInitialNotification,
  config: {
    initialRouteName: "Home",
    screens: {
      TripDetail: {
        path: "trip/:trip"
      },
      /*ShareTripLocationScreen: {
        path: "liane/:liane/start"
      },*/
      Chat: {
        path: "chat/:conversationId"
      },
      OpenJoinRequest: {
        path: "join_request/:request"
      }
    }
  }
};

export const useAppNavigation = <ScreenName extends keyof NavigationParamList>() => {
  const route = useRoute<RouteProp<NavigationParamList, ScreenName>>();
  const navigation = useNavigation<NativeStackNavigationProp<NavigationParamList, ScreenName>>();

  return { navigation, route };
};

export function getNotificationNavigation(notification: Notification) {
  if (UnionUtils.isInstanceOf(notification, "Event")) {
    if (UnionUtils.isInstanceOf(notification.payload, "JoinRequest")) {
      return (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) =>
        navigation.navigate("OpenJoinRequest", { request: notification });
    } else if (UnionUtils.isInstanceOf(notification.payload, "MemberAccepted")) {
      return (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) =>
        navigation.navigate("TripDetail", { trip: notification.payload.trip });
    }
  } else if (UnionUtils.isInstanceOf(notification, "NewMessage")) {
    return (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) =>
      navigation.navigate("Chat", { conversationId: notification.conversation });
  }
  return undefined;
}

export const RootNavigation = createNavigationContainerRef<NavigationParamList>();
