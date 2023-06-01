import {
  createNavigationContainerRef,
  NavigationContainerRefWithCurrent,
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { JoinLianeRequestDetailed, Liane, LianeMatch, UnionUtils, User } from "./index";
import { InternalLianeSearchFilter } from "@/util/ref";
import { NativeStackNavigationProp } from "@react-navigation/native-stack/src/types";
import { LianeWizardFormData } from "@/screens/lianeWizard/LianeWizardFormData";
import { InternalLianeRequest } from "@/screens/publish/StateMachine";
import { Event, Notification } from "@/api/notification";
import { JoinRequest, MemberAccepted } from "@/api/event";

export type NavigationParamList = {
  Home: undefined;
  Publish: { initialValue?: Partial<InternalLianeRequest> };
  SignUp: undefined;
  SearchResults: { filter: InternalLianeSearchFilter };
  Search: { filter: InternalLianeSearchFilter };
  RequestJoin: { request: JoinLianeRequestDetailed };
  LianeWizard: { formData?: LianeWizardFormData };
  LianeMatchDetail: { lianeMatch: LianeMatch; filter: InternalLianeSearchFilter };
  LianeJoinRequestDetail: { request: JoinLianeRequestDetailed };
  Chat: { conversationId: string; liane?: Liane };
  LianeDetail: { liane: Liane | string };
  Profile: { user: User };
  OpenJoinLianeRequest: { request: Event<JoinRequest> };
  ArchivedTrips: undefined;
  OpenValidateTrip: { liane: Liane };
};

export const useAppNavigation = <ScreenName extends keyof NavigationParamList>() => {
  const route = useRoute<RouteProp<NavigationParamList, ScreenName>>();
  const navigation = useNavigation<NativeStackNavigationProp<NavigationParamList, ScreenName>>();

  return { navigation, route };
};

export function getNotificationNavigation(notification: Notification) {
  console.debug(JSON.stringify(notification));
  /* TODO no type returned if (!UnionUtils.isInstanceOf<Event>(notification, "Event")) {
    return undefined;
  }*/
  if (!notification.payload) {
    return undefined;
  }

  if (UnionUtils.isInstanceOf<JoinRequest>(notification.payload, "JoinRequest")) {
    return (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) =>
      navigation.navigate("OpenJoinLianeRequest", { request: notification });
  } else if (UnionUtils.isInstanceOf<MemberAccepted>(notification.payload, "MemberAccepted")) {
    return (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) =>
      navigation.navigate("LianeDetail", { liane: notification.payload.liane });
  } else if (notification.payload.at) {
    return (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) =>
      navigation.navigate("LianeDetail", { liane: notification.payload.liane });
  } else if (notification.conversation) {
    return (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) =>
      navigation.navigate("Chat", { conversationId: notification.conversation });
  }
  return undefined;
}

export const RootNavigation = createNavigationContainerRef<NavigationParamList>();
