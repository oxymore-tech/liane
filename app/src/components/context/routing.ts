import { createNavigationContainerRef, LinkingOptions, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { CoLiane, CoMatch, Ref, ResolvedLianeRequest, Trip, User } from "@liane/common";
import { checkInitialNotification } from "@/api/service/notification";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type NavigationParamList = {
  Home: undefined;
  Publish: { initialValue?: ResolvedLianeRequest; liane?: CoLiane | CoMatch };
  SignUp: undefined;
  Lianes: undefined;
  CommunitiesChat: { liane?: CoLiane | Ref<CoLiane> };
  LianeMapDetail: { liane: CoLiane | CoMatch; request?: CoLiane | ResolvedLianeRequest };
  LianeTripDetail: { trip: Trip };
  TripDetail: { trip: Ref<Trip> | Trip };
  Profile: { user: User } | undefined;
  ProfileEdit: undefined;
  Account: undefined;
  TripGeolocationWizard: { showAs: "driver" | "passenger" | undefined | null; lianeId: string | undefined } | undefined;
  ArchivedTrips: undefined;
  Settings: undefined;
  RallyingPointRequests: undefined;
  CommunitiesDetails: { liane: CoLiane };
  MatchList: { matches: CoMatch[]; lianeRequest: ResolvedLianeRequest };
  Calendrier: { trip?: Ref<Trip> };
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
      TripDetail: {
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
