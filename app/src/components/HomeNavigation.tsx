import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "@/screens/HomeScreen";
import TripChatScreen from "@/screens/TripChatScreen";

const Stack = createNativeStackNavigator();

function HomeNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={TripChatScreen} options={{ headerShown: true }} />
    </Stack.Navigator>
  );
}

export default HomeNavigation;
