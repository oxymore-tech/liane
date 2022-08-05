import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import ScheduleScreen from "@/screens/ScheduleScreen";
import DetailsScreen from "@/screens/DetailsScreen";
import TripChatScreen from "@/screens/TripChatScreen";

const Stack = createStackNavigator();

function ScheduleNavigation() {
  return (
      <Stack.Navigator>
        <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={TripChatScreen} options={{ headerShown: true }} />
      </Stack.Navigator>
  );
}

export default ScheduleNavigation;
