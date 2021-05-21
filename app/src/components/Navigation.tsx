import React, { useContext } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AppLoading from "expo-app-loading";
import SignUpScreen from "@/screens/SignUpScreen";
import SignUpCodeScreen from "@/screens/SignUpCodeScreen";
import { AppContext } from "@/components/ContextProvider";
import AcceptTripScreen from "@/screens/AcceptTripScreen";
import HomeScreen from "@/screens/HomeScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import LocationWizard from "@/screens/LocationWizard";
import { Ionicons } from "@expo/vector-icons";
import { tailwind } from "@/api/tailwind";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const createDrawer = () => (
  <Tab.Navigator
    tabBarOptions={{
      style: tailwind("h-20")
    }}
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused }) => {
        const icons = {
          Home: {
            true: "map",
            false: "map-outline"
          },
          Notifications: {
            true: "chatbox-ellipses",
            false: "chatbox-ellipses-outline"
          }
        };

        return <Ionicons name={icons[route.name][focused]} style={tailwind(`text-4xl mt-4 ${focused ? "text-orange" : ""}`)} />;
      },
      tabBarLabel: ""
    })}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
    />
    <Tab.Screen name="Notifications" component={NotificationsScreen} />
  </Tab.Navigator>
);

export type NavigationParamList = {
  LocationWizard: { step?: number };
  SignUp: { phoneNumber?: string, authFailure?: boolean };
  SignUpCode: { phoneNumber: string };
};

export function Navigation() {

  const { appLoaded, locationPermissionGranted, authUser } = useContext(AppContext);

  if (!appLoaded) {
    return <AppLoading />;
  }

  if (!locationPermissionGranted) {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="LocationWizard"
          component={LocationWizard}
          options={{ headerShown: false }}
          initialParams={{ step: 0 }}
        />
      </Stack.Navigator>
    );
  }

  if (authUser) {
    return createDrawer();
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignUpCode" component={SignUpCodeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
