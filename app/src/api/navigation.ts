import { createNavigationContainerRef, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Liane, LianeMatch, LianeRequest } from "./index";
import { InternalLianeSearchFilter } from "@/util/ref";
import { NativeStackNavigationProp } from "@react-navigation/native-stack/src/types";

export type NavigationParamList = {
  Home: undefined;
  Publish: undefined;
  SignUp: {};
  SearchResults: { filter: InternalLianeSearchFilter };
  Search: { filter: InternalLianeSearchFilter };
  LianeWizard: { lianeRequest?: LianeRequest };
  LianeMatchDetail: { lianeMatch: LianeMatch; filter: InternalLianeSearchFilter };
  Chat: { conversationId: string };
  LianeDetail: { liane: Liane };
};

export const useAppNavigation = <ScreenName extends keyof NavigationParamList>() => {
  const route = useRoute<RouteProp<NavigationParamList, ScreenName>>();
  const navigation = useNavigation<NativeStackNavigationProp<NavigationParamList, ScreenName>>();

  return { navigation, route };
};
export const RootNavigation = createNavigationContainerRef<NavigationParamList>();
