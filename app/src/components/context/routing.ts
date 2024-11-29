import { createNavigationContainerRef, LinkingOptions, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { CoLiane, CoLianeRequest, CoMatch, Liane, ResolvedLianeRequest, User } from "@liane/common";
import { NativeStackNavigationProp } from "@react-navigation/native-stack/src/types";
import { checkInitialNotification } from "@/api/service/notification";

export const HOME_TRIPS = "Calendrier";
export type NavigationParamList = {
  Home: undefined;
  [HOME_TRIPS]: undefined;
  Publish: { initialValue?: ResolvedLianeRequest; liane?: CoLiane | CoMatch };
  SignUp: undefined;
  Chat: { conversationId: string; liane?: Liane };
  Lianes: undefined;
  CommunitiesChat: { group?: CoMatch; liane?: CoLiane; request?: CoLianeRequest | ResolvedLianeRequest; lianeId?: string };
  LianeMapDetail: { liane: CoLiane | CoMatch; request?: CoLiane | ResolvedLianeRequest };
  LianeTripDetail: { trip: Liane };
  LianeDetail: { liane: Liane | string };
  Profile: { user: User } | undefined;
  ProfileEdit: undefined;
  Account: undefined;
  TripGeolocationWizard: { showAs: "driver" | "passenger" | undefined | null; lianeId: string | undefined } | undefined;
  ArchivedTrips: undefined;
  Settings: undefined;
  RallyingPointRequests: undefined;
  CommunitiesDetails: { liane: CoLiane };
  MatchList: { matches: CoMatch[]; lianeRequest: ResolvedLianeRequest };
};

export const NavigationScreenTitles = {
  Publish: "Créer une annonce",
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
        path: "trip/:liane"
      },
      MatchList: {
        path: "liane/:lianeId/match"
      },
      Lianes: {
        path: "liane"
      },
      CommunitiesChat: {
        path: "liane/:lianeId"
      }
    }
  }
};

export const useAppNavigation = <ScreenName extends keyof NavigationParamList>() => {
  const route = useRoute<RouteProp<NavigationParamList, ScreenName>>();
  const navigation = useNavigation<NativeStackNavigationProp<NavigationParamList, ScreenName>>();

  return { navigation, route };
};

export const RootNavigation = createNavigationContainerRef<NavigationParamList>();
