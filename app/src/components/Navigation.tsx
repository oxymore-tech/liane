import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import colors from "tailwindcss/colors";
import SignUpScreen from "@/screens/SignUpScreen";
import SignUpCodeScreen from "@/screens/SignUpCodeScreen";
import { AppContext } from "@/components/ContextProvider";
import PublishScreen from "@/screens/PublishScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import HomeNavigation from "@/components/HomeNavigation";
import { AppIcon } from "@/components/base/AppIcon";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Navigation() {
  const { authUser } = useContext(AppContext);

  if (authUser) {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarStyle: { position: "absolute", backgroundColor: colors.gray["600"], borderTopWidth: 0 },
          tabBarActiveBackgroundColor: colors.yellow["400"],
          tabBarIcon: ({ focused }: { focused: boolean }) => {
            const icons = {
              HomeRoot: {
                true: "time",
                false: "time"
              },
              Publish: {
                true: "add-circle",
                false: "add-circle"
              },
              Notifications: {
                true: "chatbox-ellipses",
                false: "chatbox-ellipses"
              },
              Settings: {
                true: "settings",
                false: "settings"
              }
            };

            return (
              <AppIcon
                name={icons[route.name][focused]}
                tw={`text-4xl mt-4 h-10 ${focused ? "text-gray-700" : "text-yellow-300"}`}
              />
            );
          },
          tabBarLabel: ""
        })}
      >
        <Tab.Screen
          name="HomeRoot"
          options={{ headerShown: false }}
          component={HomeNavigation}
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
