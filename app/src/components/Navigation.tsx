import React, { useContext } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AppLoading from "expo-app-loading";
import SignUpScreen from "@/screens/SignUpScreen";
import SignUpCodeScreen from "@/screens/SignUpCodeScreen";
import { AppContext } from "@/components/ContextProvider";
import HomeScreen from "@/screens/HomeScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import { Ionicons } from "@expo/vector-icons";
import { tw } from "@/api/tailwind";
import { LocationPermissionLevel } from "@/api";
import LocationWizard2 from "@/screens/LocationWizard";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const createDrawer = () => (
  <Tab.Navigator
    tabBarOptions={{
      style: tw("h-20")
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

        return <Ionicons name={icons[route.name][focused]} style={tw(`text-4xl mt-4 ${focused ? "text-orange" : ""}`)} />;
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
  Home: {};
  TripList: { count?: number };
  LocationWizard: { step?: number };
  SignUp: { phoneNumber?: string, authFailure?: boolean };
  SignUpCode: { phoneNumber: string };
  LocationTaskNotification: {};
};

export function Navigation() {

  const { appLoaded, locationPermissionLevel, authUser } = useContext(AppContext);

  if (!appLoaded) {
    return <AppLoading />;
  }

  if (locationPermissionLevel === LocationPermissionLevel.NEVER) {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="LocationWizard"
          component={LocationWizard2}
          options={{ headerShown: false }}
          // initialParams={{ step: 0 }}
        />
      </Stack.Navigator>
    );
  }

  /*
  if (locationPermissionLevel === LocationPermissionLevel.NEVER) {
    console.log("asking again ");
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="LocationWizardAskingAgain"
          component={LocationWizard2}
          options={{ headerShown: false }}
          initialParams={{ step: 1 }}
        />
      </Stack.Navigator>
    );
  } */

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
