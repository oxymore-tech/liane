import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ScheduleScreen from "@/screens/ScheduleScreen";
import TripChatScreen from "@/screens/TripChatScreen";

const Stack = createNativeStackNavigator();

function ScheduleNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={TripChatScreen} options={{ headerShown: true }} />
    </Stack.Navigator>
  );
}

export default ScheduleNavigation;
