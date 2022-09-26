import { createNavigationContainerRef } from "@react-navigation/native";
import { TripIntentMatch } from "@/api/index";

export type NavigationParamList = {
  Home: undefined;
  Publish: undefined;
  Chat: { matchedTripIntent: TripIntentMatch; };
  SignUp: { phoneNumber?: string, authFailure?: boolean };
  SignUpCode: { phoneNumber: string };
};

export const RootNavigation = createNavigationContainerRef<NavigationParamList>();