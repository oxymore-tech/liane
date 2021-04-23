import React, { useContext } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import AppLoading from "expo-app-loading";
import SignUpScreen from "@/screens/SignUpScreen";
import SignUpCodeScreen from "@/screens/SignUpCodeScreen";
import { AppContext } from "@/components/ContextProvider";
import AcceptTripScreen from "@/screens/AcceptTripScreen";
import HomeScreen from "@/screens/HomeScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import LocationWizard from "@/screens/LocationWizard";

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const createDrawer = () => (
  <Drawer.Navigator>
    <Drawer.Screen
      name="Accueil"
      component={HomeScreen}
    />
    <Drawer.Screen name="Notifications" component={NotificationsScreen} />
  </Drawer.Navigator>
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
    return (
      <Stack.Navigator>
        <Stack.Screen name="Home" component={createDrawer} options={{ headerShown: false }} />
        <Stack.Screen name="AcceptTrip" component={AcceptTripScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignUpCode" component={SignUpCodeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
