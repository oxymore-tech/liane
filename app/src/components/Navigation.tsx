import React, { useContext } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import SignUpScreen from "@/screens/SignUpScreen";
import SignUpCodeScreen from "@/screens/SignUpCodeScreen";
import { AppContext } from "@/components/ContextProvider";
import NotificationsScreen from "@/screens/NotificationsScreen";
import { Ionicons } from "@expo/vector-icons";
import { tw } from "@/api/tailwind";
import { LocationPermissionLevel } from "@/api";
import LocationWizard2 from "@/screens/LocationWizard";
import CreateTripScreen from "@/screens/CreateTripScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import HomeNavigation from "@/components/HomeNavigation";
import ScheduleNavigation from "@/components/ScheduleNavigation";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

export type NavigationParamList = {
  Home: {};
  Schedule: {};
  Details: { tripID: string };
  TripList: { count?: number, day?: string, hour?: number };
  SignUp: { phoneNumber?: string, authFailure?: boolean };
  SignUpCode: { phoneNumber: string };
};

function Navigation() {

  const { locationPermissionLevel, authUser } = useContext(AppContext);

  if (locationPermissionLevel === LocationPermissionLevel.NEVER) {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="LocationWizard"
          component={LocationWizard2}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  if (authUser) {
    return (
      <Tab.Navigator
        tabBarOptions={{
          style: tw("h-20")
        }}
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
          name="Notifications"
          component={NotificationsScreen}
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
