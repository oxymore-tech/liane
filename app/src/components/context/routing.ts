import {
  createNavigationContainerRef,
  LinkingOptions,
  NavigationContainerRefWithCurrent,
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import {
  CoLiane,
  CoLianeRequest,
  CoMatch,
  Event,
  JoinLianeRequestDetailed,
  JoinRequest,
  Liane,
  Notification,
  ResolvedLianeRequest,
  UnionUtils,
  User
} from "@liane/common";
import { NativeStackNavigationProp } from "@react-navigation/native-stack/src/types";
import { InternalLianeRequest } from "@/screens/publish/StateMachine";
import { checkInitialNotification } from "@/api/service/notification";

export const HOME_TRIPS = "Mes trajets";
export type NavigationParamList = {
  Home: undefined;
  [HOME_TRIPS]: undefined;
  Publish: { initialValue?: Partial<InternalLianeRequest> };
  SignUp: undefined;
  RequestJoin: { request: JoinLianeRequestDetailed };
  LianeJoinRequestDetail: { request: JoinLianeRequestDetailed | string };
  Chat: { conversationId: string; liane?: Liane };
  Communities: undefined;
  CommunitiesChat: { group?: CoMatch; liane?: CoLiane; request?: CoLianeRequest | ResolvedLianeRequest; lianeId?: string };
  LianeDetail: { liane: Liane | string };
  Profile: { user: User } | undefined;
  ProfileEdit: undefined;
  Account: undefined;
  OpenJoinLianeRequest: { request: Event<JoinRequest> };
  TripGeolocationWizard: { showAs: "driver" | "passenger" | undefined | null; lianeId: string | undefined } | undefined;
  ArchivedTrips: undefined;
  Settings: undefined;
  //OpenValidateTrip: { liane: Liane };
  Notifications: undefined;
  RallyingPointRequests: undefined;
  CommunitiesDetails: { liane: CoLiane };
  ListGroups: { groups: CoMatch[]; lianeRequest: ResolvedLianeRequest };
};

export const NavigationScreenTitles = {
  Publish: "Créer une Liane",
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
      LianeDetail: {
        path: "liane/:liane"
      },
      /*ShareTripLocationScreen: {
        path: "liane/:liane/start"
      },*/
      Chat: {
        path: "chat/:conversationId"
      },
      OpenJoinLianeRequest: {
        path: "join_request/:request"
      },
      CommunitiesChat: {
        path: "community/:lianeId"
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
        navigation.navigate("OpenJoinLianeRequest", { request: notification });
    } else if (UnionUtils.isInstanceOf(notification.payload, "MemberAccepted")) {
      return (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) =>
        navigation.navigate("LianeDetail", { liane: notification.payload.liane });
    }
  } else if (UnionUtils.isInstanceOf(notification, "NewMessage")) {
    return (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) =>
      navigation.navigate("Chat", { conversationId: notification.conversation });
  } else if (UnionUtils.isInstanceOf(notification, "LianeMessage")) {
    return (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) =>
      navigation.navigate("CommunitiesChat", { lianeId: notification.liane });
  }
  return undefined;
}

export const RootNavigation = createNavigationContainerRef<NavigationParamList>();
