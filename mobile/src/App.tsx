import React, { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { registerRootComponent } from "expo";
import { ContextProvider } from "@components/ContextProvider";
import { Navigation } from "@components/Navigation";
import { DdRumReactNavigationTracking, DdSdkReactNative, DdSdkReactNativeConfiguration } from "dd-sdk-reactnative";

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

  const navigationRef = useRef<NavigationContainerRef>(null);
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
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
        }}
      >
        <Navigation />
      </NavigationContainer>
    </ContextProvider>
  );
}

export default registerRootComponent(App);