import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTailwind } from "tailwind-rn";
import { createNavigationContainerRef } from "@react-navigation/native";
import SignUpScreen from "@/screens/SignUpScreen";
import SignUpCodeScreen from "@/screens/SignUpCodeScreen";
import { AppContext } from "@/components/ContextProvider";
import { TripIntentMatch } from "@/api";
import PublishScreen from "@/screens/PublishScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import HomeScreen from "@/screens/HomeScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export type NavigationParamList = {
  Home: {};
  Publish: {};
  Chat: { matchedTripIntent: TripIntentMatch; };
  SignUp: { phoneNumber?: string, authFailure?: boolean };
  SignUpCode: { phoneNumber: string };
};

export const navigation = createNavigationContainerRef<NavigationParamList>();

function Navigation() {
  const { authUser } = useContext(AppContext);
  const tw = useTailwind();

  if (authUser) {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }: { focused: boolean }) => {
            const icons = {
              Home: {
                true: "time",
                false: "time-outline"
              },
              Publish: {
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

            return (
              <Ionicons
                name={icons[route.name][focused]}
                style={tw(`text-4xl mt-4 ${focused ? "text-liane-orange" : ""}`)}
              />
            );
          },
          tabBarLabel: ""
        })}
      >
        <Tab.Screen
          name="Home"
          options={{ headerShown: false }}
          component={HomeScreen}
        />
        <Tab.Screen
          name="Publish"
          options={{ headerShown: false }}
          component={PublishScreen}
        />
        <Tab.Screen
          name="Settings"
          options={{ headerShown: false }}
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
