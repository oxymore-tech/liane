import notifee, { AndroidAction, AndroidImportance, Event, EventType, TriggerType } from "@notifee/react-native";
import { FullUser, PaginatedResponse, RallyingPoint, Ref } from "@/api";
import { get, patch } from "@/api/http";
import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { AuthService } from "@/api/service/auth";
import { Linking, Platform } from "react-native";
import { AbstractNotificationService } from "@/api/service/interfaces/notification";
import { Notification } from "@/api/notification";
import { formatTime } from "@/api/i18n";
import DeviceInfo from "react-native-device-info";
import { checkLocationPingsPermissions, startPositionTracking } from "@/api/service/location";
import { LianeServiceClient } from "@/api/service/liane";
import { getTripFromLiane } from "@/components/trip/trip";
import { getCurrentUser } from "@/api/storage";
import { AppLogger } from "@/api/logger";

export class NotificationServiceClient extends AbstractNotificationService {
  async list(cursor?: string | undefined): Promise<PaginatedResponse<Notification>> {
    const paramString = cursor ? `?cursor=${cursor}` : "";
    return await get("/notification" + paramString);
  }
  override markAsRead = async (notification: Ref<Notification>) => {
    await patch(`/notification/${notification}`);
    await this.decrementCounter(notification);
  };

  override receiveNotification = async (notification: Notification, display: boolean = false): Promise<void> => {
    await this.incrementCounter(notification.id!);
    if (display) {
      await displayNotifeeNotification(notification);
    }
  };
}

const DefaultChannelId = "liane_default";

const DefaultAndroidSettings = {
  channelId: DefaultChannelId,
  pressAction: {
    id: "default"
  },
  smallIcon: "ic_notification",
  largeIcon: "ic_launcher"
};

const AndroidReminderActions: AndroidAction[] = [
  {
    title: "Démarrer le trajet",
    pressAction: {
      id: "loc"
    }
  }
  /*{
    title: "J'ai du retard",
    pressAction: {
      id: "delay",
      launchActivity: "default"
    }
  }*/
];

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
    const liane = await new LianeServiceClient().get(lianeId);
    const user = await getCurrentUser();
    const trip = getTripFromLiane(liane, user!.id!);
    await startPositionTracking(liane.id!, trip.wayPoints);
  }
} as const;
const openNotification = async ({ type, detail }: Event) => {
  const { notification, pressAction } = detail;
  AppLogger.debug("NOTIFICATIONS", "notifee", detail);

  if (type === EventType.PRESS && notification?.data?.uri) {
    await Linking.openURL(<string>notification.data.uri);
  } else if (type === EventType.ACTION_PRESS && notification?.data?.uri && pressAction) {
    if (pressAction.id === "loc" && (await checkLocationPingsPermissions()) && (await DeviceInfo.isLocationEnabled())) {
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
    data: notification
  });
}

export async function cancelReminder(lianeId: string) {
  await notifee.cancelTriggerNotification(lianeId);
}
export async function createReminder(lianeId: string, departureLocation: RallyingPoint, departureTime: Date) {
  await notifee.createTriggerNotification(
    {
      id: lianeId,
      ios: {
        categoryId: "reminder",
        interruptionLevel: "timeSensitive"
      },
      android: {
        ...DefaultAndroidSettings,
        lightUpScreen: true,
        importance: AndroidImportance.HIGH,
        tag: "reminder",
        actions: AndroidReminderActions
      },
      title: "Départ imminent",
      body: `Vous avez rendez-vous à ${formatTime(departureTime)} à ${departureLocation.label}.`,
      data: { uri: `liane://liane/${lianeId}/start`, liane: lianeId }
    },
    { timestamp: Math.max(departureTime.getTime() - 1000 * 60 * 5, new Date().getTime() + 5 * 1000), type: TriggerType.TIMESTAMP, alarmManager: true }
  );
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
      if (n.pressAction.id === "loc" && (await checkLocationPingsPermissions()) && (await DeviceInfo.isLocationEnabled())) {
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
