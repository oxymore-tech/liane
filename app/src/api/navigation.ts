import { createNavigationContainerRef } from "@react-navigation/native";
import { TripIntentMatch } from "./index";

export type NavigationParamList = {
  Home: undefined;
  Publish: undefined;
  Chat: { matchedTripIntent: TripIntentMatch };
  SignUp: {};
};

export const RootNavigation = createNavigationContainerRef<NavigationParamList>();
