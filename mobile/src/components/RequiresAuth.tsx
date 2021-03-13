import React, { useContext } from 'react';
import SignUpScreen from "@screens/SignUpScreen";
import SignUpCodeScreen from "@screens/SignUpCodeScreen";
import { createStackNavigator } from "@react-navigation/stack";
import { AppContext } from "@components/ContextProvider";
import AcceptTripScreen from "@screens/AcceptTripScreen";
import HomeScreen from "@screens/HomeScreen";
import NotificationsScreen from "@screens/NotificationsScreen";
import { createDrawerNavigator } from "@react-navigation/drawer";

interface RequiresAuthProps {

}

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();


const createDrawer = () => {
  return (
    <Drawer.Navigator>
      <Drawer.Screen
        name="Accueil"
        component={HomeScreen}
      />
      {
        /*
          <Drawer.Screen name="Profil" component={ProfileScreen} />
          <Drawer.Screen name="Recherche trajets" component={FilterAndSearch} />
          <Drawer.Screen name="Carte" component={MapScreen} />
          <Drawer.Screen name="Carte et résultats" component={MapAndResultsScreen} />
        */
        <Drawer.Screen name="Notifications" component={NotificationsScreen}/>
        /*
          <Drawer.Screen name="Réglages" component={SettingsScreen} />
        */
      }
    </Drawer.Navigator>
  );
};

export function RequiresAuth({}: RequiresAuthProps) {

  const {authUser} = useContext(AppContext);

  if (authUser) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Home" component={createDrawer} options={{headerShown: false}}/>
        <Stack.Screen name="AcceptTrip" component={AcceptTripScreen} options={{headerShown: false}}/>
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{headerShown: false}}/>
      <Stack.Screen name="SignUpSms" component={SignUpCodeScreen} options={{headerShown: false}}/>
    </Stack.Navigator>
  );
}
