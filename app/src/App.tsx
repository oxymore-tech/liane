import React, { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import i18n from "i18n-js";
import en from "@/assets/translations/en.json";
import fr from "@/assets/translations/fr.json";
import { NavigationContainer } from "@react-navigation/native";
import { locale } from "@/api/i18n";
import ContextProvider from "@/components/ContextProvider";
import Navigation from "@/components/Navigation";

i18n.translations = {
  en,
  fr
};
i18n.locale = locale;
i18n.missingBehaviour = "guess";

export type Subscription = {
  remove: () => void;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

function App() {

  const notificationListener = useRef<Subscription>();
  const responseListener = useRef<Subscription>();

  useEffect(() => {

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});
    
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };

  });
  
  return (
    <ContextProvider>
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </ContextProvider>
  );
}

export default App;