import { createNavigationContainerRef } from "@react-navigation/native";
import { TripIntentMatch } from "./index";
import { SignUpStep } from "@/screens/signUp/SignUpScreen";

export type NavigationParamList = {
  Home: undefined;
  Publish: undefined;
  Chat: { matchedTripIntent: TripIntentMatch; };
  SignUp: { signUpStep: SignUpStep, phoneNumber?: string, authFailure?: boolean };
};

export const RootNavigation = createNavigationContainerRef<NavigationParamList>();