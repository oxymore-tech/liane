import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTailwind } from "tailwind-rn";
import SignUpScreen from "@/screens/SignUpScreen";
import SignUpCodeScreen from "@/screens/SignUpCodeScreen";
import { AppContext } from "@/components/ContextProvider";
import { MatchedTripIntent, TripIntent } from "@/api";
import CreateTripScreen from "@/screens/CreateTripScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import HomeNavigation from "@/components/HomeNavigation";
import ScheduleNavigation from "@/components/ScheduleNavigation";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export type NavigationParamList = {
  Home: {};
  Schedule: {};
  Chat: { tripIntent: TripIntent, matchedIntent : MatchedTripIntent | null };
  Details: { tripID: string };
  TripList: { count?: number, day?: string, hour?: number };
  SignUp: { phoneNumber?: string, authFailure?: boolean };
  SignUpCode: { phoneNumber: string };
};

function Navigation() {
  const { authUser } = useContext(AppContext);
  const tw = useTailwind();

  if (authUser) {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }: { focused:boolean }) => {
            const icons = {
              Home: {
                true: "map",
                false: "map-outline"
              },
              Schedule: {
                true: "time",
                false: "time-outline"
              },
              CreateTrip: {
                true: "add-circle",
                false: "add-circle-outline"
              },
              Notifications: {
                true: "chatbox-ellipses",
                false: "chatbox-ellipses-outline"
              },
              Settings: {
                true: "settings",
                false: "settings-outline"
              }
            };

            return <Ionicons name={icons[route.name][focused]} style={tw(`text-4xl mt-4 ${focused ? "text-orange" : ""}`)} />;
          },
          tabBarLabel: ""
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeNavigation}
        />
        <Tab.Screen
          name="Schedule"
          component={ScheduleNavigation}
        />
        <Tab.Screen
          name="CreateTrip"
          component={CreateTripScreen}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
        />

      </Tab.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignUpCode" component={SignUpCodeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default Navigation;
