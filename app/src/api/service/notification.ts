import notifee, { Event, EventType } from "@notifee/react-native";
import { AuthService, FullUser, HttpClient, LianeServiceClient, Notification } from "@liane/common";
import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { Linking, Platform } from "react-native";
import { AppLogger } from "@/api/logger";
import { AppStorage } from "@/api/storage";
import { AppEnv } from "@/api/env";
import { startGeolocationService } from "@/screens/detail/components/GeolocationSwitch";

const DefaultChannelId = "liane_default";

export const DefaultAndroidSettings = {
  channelId: DefaultChannelId,
  pressAction: {
    id: "default"
  },
  smallIcon: "ic_notification",
  largeIcon: "ic_launcher"
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
  loc: async (lianeId: string) => {
    const logger = AppLogger as any;
    const http = new HttpClient(AppEnv, logger, AppStorage);
    const lianeService = new LianeServiceClient(http);
    const liane = await lianeService.get(lianeId);
    await lianeService.start(liane.id!).then(() => startGeolocationService(liane));
  }
} as const;

const openNotification = async ({ type, detail }: Event) => {
  const { notification, pressAction } = detail;
  AppLogger.debug("NOTIFICATIONS", "notifee", detail);

  if (type === EventType.PRESS && notification?.data?.uri) {
    await Linking.openURL(<string>notification.data.uri);
  } else if (type === EventType.ACTION_PRESS && notification?.data?.uri && pressAction) {
    if (pressAction.id === "loc") {
      // start sending pings
      await pressActionMap.loc(notification.data.liane as string);
    } else {
      await Linking.openURL(<string>notification.data.uri);
    }
  } else if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
    AppLogger.warn("NOTIFICATIONS", "[NOTIFEE]", type, pressAction?.id, notification?.data?.uri);
  }
};

// Called when notification is pressed and app is open
notifee.onBackgroundEvent(openNotification);
notifee.onForegroundEvent(openNotification);

export async function displayNotifeeNotification(notification: Notification) {
  await notifee.displayNotification({
    android: DefaultAndroidSettings,
    title: notification.title,
    body: notification.message,
    data: { uri: "liane://" } //TODO add to notification payload
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

export async function initializePushNotification(user: FullUser, authService: AuthService) {
  try {
    const pushToken = await PushNotifications?.getToken();
    if (pushToken && pushToken !== user.pushToken) {
      AppLogger.debug("NOTIFICATIONS", "New push token", pushToken);
      // Update server's token
      await authService.updatePushToken(pushToken);
    }
    PushNotifications?.onTokenRefresh(async p => {
      await authService.updatePushToken(p);
    });
    PushNotifications?.onMessage(onMessageReceived);
    return true;
  } catch (e) {
    console.error(e);
  }
  return false;
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
const openFirebaseNotification = (m: FirebaseMessagingTypes.RemoteMessage | null) => {
  if (!m) {
    return;
  }
  AppLogger.info("NOTIFICATIONS", "opened firebase notification", m);
  if (m?.data?.uri) {
    Linking.openURL(<string>m.data.uri);
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
        await pressActionMap.loc(n.notification.data.liane as string);
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
