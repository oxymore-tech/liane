import {
  createNavigationContainerRef,
  NavigationContainerRefWithCurrent,
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { isJoinLianeRequest, JoinLianeRequest, JoinLianeRequestDetailed, Liane, LianeMatch, Notification, User } from "./index";
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
  Chat: { conversationId: string };
  LianeDetail: { liane: Liane | string };
  OpenJoinLianeRequest: { request: JoinLianeRequest };
};

export const useAppNavigation = <ScreenName extends keyof NavigationParamList>() => {
  const route = useRoute<RouteProp<NavigationParamList, ScreenName>>();
  const navigation = useNavigation<NativeStackNavigationProp<NavigationParamList, ScreenName>>();

  return { navigation, route };
};

export const getNotificationNavigation = ({
  payload
}: Notification): ((navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) => void) => {
  if (isJoinLianeRequest(payload)) {
    if (payload.event.accepted) {
      return navigation => navigation.navigate("LianeDetail", { liane: payload.event.targetLiane });
    }
  } else {
    return navigation => navigation.navigate("OpenJoinLianeRequest", { request: payload.event });
  }

  return () => {};
};

export const RootNavigation = createNavigationContainerRef<NavigationParamList>();
