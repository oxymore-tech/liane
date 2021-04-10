import React, { useContext } from "react";
import SignUpScreen from "@screens/SignUpScreen";
import SignUpCodeScreen from "@screens/SignUpCodeScreen";
import { createStackNavigator } from "@react-navigation/stack";
import { AppContext } from "@components/ContextProvider";
import AcceptTripScreen from "@screens/AcceptTripScreen";
import HomeScreen from "@screens/HomeScreen";
import NotificationsScreen from "@screens/NotificationsScreen";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { usePermissions } from "expo-permissions";
import { Permissions } from "react-native-unimodules";
import LocationWizard from "@screens/wizard/LocationWizard";
import AppLoading from "expo-app-loading";

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
      <Stack.Screen name="SignUpSms" component={SignUpCodeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
