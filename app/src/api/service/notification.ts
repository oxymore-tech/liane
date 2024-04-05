import notifee, { Event, EventType } from "@notifee/react-native";
import { FullUser, HttpClient, TripServiceClient, Notification } from "@liane/common";
import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { Linking, Platform } from "react-native";
import { AppLogger } from "@/api/logger";
import { AppStorage } from "@/api/storage";
import { RNAppEnv } from "@/api/env";
import { startGeolocationService } from "@/screens/detail/components/GeolocationSwitch";
import { AppServices } from "@/api/service/index";

const DefaultChannelId = "liane_default";

export const DefaultAndroidSettings = {
  channelId: DefaultChannelId,
  pressAction: {
    id: "default"
  },
  smallIcon: "ic_notification"
};

async function onMessageReceived(message: FirebaseMessagingTypes.RemoteMessage) {
  AppLogger.debug("NOTIFICATIONS", "Received push", message);
  if (!message.notification) {
    return;
  }
  const { title, body } = message.notification;
  return await notifee.displayNotification({
    android: DefaultAndroidSettings,
    title,
    body,
    data: message.data
  });
}

const pressActionMap = {
  loc: async (tripId: string) => {
    const logger = AppLogger as any;
    const http = new HttpClient(RNAppEnv.baseUrl, logger, AppStorage);
    const tripService = new TripServiceClient(http);
    const trip = await tripService.get(tripId);
    await tripService.start(trip.id!).then(() => startGeolocationService(trip));
  }
} as const;

const openNotification = async ({ type, detail }: Event) => {
  const { notification, pressAction } = detail;
  AppLogger.debug("NOTIFICATIONS", "notifee", detail);

  try {
    if (type === EventType.PRESS && notification?.data?.uri) {
      await Linking.openURL(<string>notification.data.uri);
    } else if (type === EventType.ACTION_PRESS && notification?.data?.uri && pressAction) {
      if (pressAction.id === "loc") {
        // start sending pings
        await pressActionMap.loc(notification.data.trip as string);
      } else {
        await Linking.openURL(<string>notification.data.uri);
      }
    } else if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
      AppLogger.warn("NOTIFICATIONS", "[NOTIFEE]", type, pressAction?.id, notification?.data?.uri);
    }
  } catch (e) {
    AppLogger.error("NOTIFICATIONS", "Unable to open notification", e);
  }
};

// Called when notification is pressed and app is open
notifee.onBackgroundEvent(openNotification);
notifee.onForegroundEvent(openNotification);

export async function displayNotifeeNotification(notification: Notification) {
  const data: { [key: string]: string | object | number } = {};
  if (notification.uri) {
    data.uri = notification.uri;
  }
  await notifee.displayNotification({
    android: DefaultAndroidSettings,
    title: notification.title,
    body: notification.message,
    data
  });
}

export async function initializeNotification() {
  // Request permissions (required for iOS & Android > 13)
  await notifee.requestPermission();

  // Create a channel (required for Android)
  await notifee.createChannel({
    id: DefaultChannelId,
    name: "Général"
  });

  // Set IOS categories
  await notifee.setNotificationCategories([
    {
      id: "default"
    },
    {
      id: "reminder",
      actions: [
        {
          title: "Démarrer le trajet",
          id: "loc"
        }
        /*{
          title: "J'ai du retard",
          foreground: true,
          id: "delay"
        }*/
      ]
    }
  ]);
}

export async function initPushNotification(user: FullUser, services: AppServices) {
  try {
    const pushToken = await PushNotifications?.getToken();
    if (pushToken && pushToken !== user.pushToken) {
      services.logger.debug("NOTIFICATIONS", "New push token", pushToken);
      await services.auth.updatePushToken(pushToken);
    }
    PushNotifications?.onTokenRefresh(async p => {
      await services.auth.updatePushToken(p);
    });
    PushNotifications?.onMessage(onMessageReceived);
  } catch (e) {
    services.logger.error("NOTIFICATIONS", "Unable to initPushNotification", e);
  }
}

export const PushNotifications = (() => {
  try {
    if (!__DEV__ || Platform.OS === "android") {
      return messaging();
    }
  } catch (e) {
    AppLogger.error("NOTIFICATIONS", "Could not init push notifications", e);
  }
  return undefined;
})();
const openFirebaseNotification = async (m: FirebaseMessagingTypes.RemoteMessage | null) => {
  if (!m) {
    return;
  }
  AppLogger.info("NOTIFICATIONS", "opened firebase notification", m);
  if (m?.data?.uri) {
    await Linking.openURL(<string>m.data.uri);
  }
};

PushNotifications?.onNotificationOpenedApp(openFirebaseNotification);

export const checkInitialNotification = async (): Promise<string | undefined | null> => {
  const firebaseNotification = await PushNotifications?.getInitialNotification();
  if (firebaseNotification) {
    AppLogger.info("NOTIFICATIONS", "opened firebase notification", firebaseNotification);
    return <string | undefined>firebaseNotification.data?.uri;
  }
  const n = await notifee.getInitialNotification();
  if (n) {
    AppLogger.info("NOTIFICATIONS", "opened local notification", n);

    if (n.notification.data?.uri) {
      if (n.pressAction.id === "loc") {
        // start sending pings
        await pressActionMap.loc(n.notification.data.trip as string);
        return undefined;
      } else {
        return <string>n.notification.data?.uri;
      }
    }
  }
  const url = await Linking.getInitialURL();
  if (url) {
    AppLogger.debug("DEEP_LINKING", "opened with", url);
  }
  return url;
};
