import { createNavigationContainerRef, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { JoinLianeRequest, JoinLianeRequestDetailed, Liane, LianeMatch } from "./index";
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
  Chat: { conversationId: string };
  LianeDetail: { liane: Liane | string };
  OpenJoinLianeRequest: { request: JoinLianeRequest };
};

export const useAppNavigation = <ScreenName extends keyof NavigationParamList>() => {
  const route = useRoute<RouteProp<NavigationParamList, ScreenName>>();
  const navigation = useNavigation<NativeStackNavigationProp<NavigationParamList, ScreenName>>();

  return { navigation, route };
};
export const RootNavigation = createNavigationContainerRef<NavigationParamList>();
