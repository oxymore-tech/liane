import React, { useContext, useEffect, useRef } from 'react';
import { Inter_400Regular, useFonts } from '@expo-google-fonts/inter';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';

import AppLoading from "expo-app-loading";
import { registerRootComponent } from "expo";

import { AppContext, ContextProvider } from "@components/ContextProvider";
import { RequiresAuth } from "@components/RequiresAuth";
import { listenLocationTask } from "@api/location-task";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

listenLocationTask();

function App() {
  const [loaded, error] = useFonts({
    Inter: Inter_400Regular,
  });

  const notificationListener = useRef();
  const responseListener = useRef();

  const {authUser} = useContext(AppContext);

  useEffect(() => {

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(data => {
    });

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
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
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };

  }, []);

  if (!loaded) {
    return <AppLoading/>;
  }

  return (
    <ContextProvider>
      <NavigationContainer>
        <RequiresAuth/>
      </NavigationContainer>
    </ContextProvider>
  );
}

export default registerRootComponent(App);