import {
  createNavigationContainerRef,
  NavigationContainerRefWithCurrent,
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { isJoinLianeRequest, isJoinRequestAccepted, JoinLianeRequestDetailed, JoinRequest, Liane, LianeMatch, NotificationPayload } from "./index";
import { InternalLianeSearchFilter } from "@/util/ref";
import { NativeStackNavigationProp } from "@react-navigation/native-stack/src/types";
import { LianeWizardFormData } from "@/screens/lianeWizard/LianeWizardFormData";

export type NavigationParamList = {
  Home: undefined;
  Publish: undefined;
  SignUp: {};
  SearchResults: { filter: InternalLianeSearchFilter };
  Search: { filter: InternalLianeSearchFilter };
  RequestJoin: { request: JoinLianeRequestDetailed };
  LianeWizard: { formData?: LianeWizardFormData };
  LianeMatchDetail: { lianeMatch: LianeMatch; filter: InternalLianeSearchFilter };

  LianeJoinRequestDetail: { request: JoinLianeRequestDetailed };
  Chat: { conversationId: string; liane?: Liane };
  LianeDetail: { liane: Liane | string };
  OpenJoinLianeRequest: { request: NotificationPayload<JoinRequest> };
};

export const useAppNavigation = <ScreenName extends keyof NavigationParamList>() => {
  const route = useRoute<RouteProp<NavigationParamList, ScreenName>>();
  const navigation = useNavigation<NativeStackNavigationProp<NavigationParamList, ScreenName>>();

  return { navigation, route };
};

export const getNotificationNavigation = (
  payload: NotificationPayload<any>
): ((navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) => void) => {
  if (isJoinLianeRequest(payload)) {
    return navigation => navigation.navigate("OpenJoinLianeRequest", { request: payload });
  } else if (isJoinRequestAccepted(payload)) {
    return navigation => navigation.navigate("LianeDetail", { liane: payload.content.liane });
  }

  return () => {};
};

export const RootNavigation = createNavigationContainerRef<NavigationParamList>();
