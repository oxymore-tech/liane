import React, { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import i18n from "i18n-js";
import en from "@/assets/translations/en.json";
import fr from "@/assets/translations/fr.json";
import { ContextProvider } from "@/components/ContextProvider";
import { Navigation } from "@/components/Navigation";
import { listenLocationTask } from "@/api/location-task";
import { NavigationContainer } from "@react-navigation/native";
import { localeAsString } from "@/api/i18n";

i18n.translations = {
  en,
  fr
};
i18n.locale = localeAsString;
i18n.missingBehaviour = "guess";

export type Subscription = {
  remove: () => void;
};

listenLocationTask();

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
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
    });

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const notification = response.notification.request.content.data;
      /*
      if(notification.type == 'covoiturage_notification') {
        var newList = askNotifications.concat({
            name : notification.name + ' souhaite covoiturer avec vous',
            subtitle : 'Son numéro est le ' + notification.number,
            tripId : 1
        });
        setAskNotifications(newList);
      }
      */
    });

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