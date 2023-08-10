import notifee, { AndroidAction, AndroidImportance, Event, EventType, TriggerType } from "@notifee/react-native";
import { FullUser, PaginatedResponse, RallyingPoint } from "@/api";
import { get, patch } from "@/api/http";
import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { AuthService } from "@/api/service/auth";
import { Linking, Platform } from "react-native";
import { AbstractNotificationService } from "@/api/service/interfaces/notification";
import { Notification } from "@/api/notification";
import { formatTime } from "@/api/i18n";
import DeviceInfo from "react-native-device-info";
import { checkLocationPingsPermissions, sendLocationPings } from "@/api/service/location";
import { LianeServiceClient } from "@/api/service/liane";

export class NotificationServiceClient extends AbstractNotificationService {
  async list(): Promise<PaginatedResponse<Notification>> {
    return await get("/notification");
  }
  markAsRead = async (notification: Notification) => {
    // TODO find out how to use super
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() - 1);
    await patch(`/notification/${notification.id}`);
  };

  override receiveNotification = async (notification: Notification, display: boolean = false): Promise<void> => {
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() + 1);
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
    title: "Démarrer",
    pressAction: {
      id: "loc"
    }
  },
  {
    title: "J'ai du retard",
    pressAction: {
      id: "delay",
      launchActivity: "default"
    }
  }
];

async function onMessageReceived(message: FirebaseMessagingTypes.RemoteMessage) {
  console.log("[NOTIF] received push", JSON.stringify(message));
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

const openNotification = async ({ type, detail }: Event) => {
  const { notification, pressAction } = detail;
  console.debug("[NOTIFEE]", JSON.stringify(detail));

  if (type === EventType.PRESS && notification?.data?.uri) {
    await Linking.openURL(<string>notification.data.uri);
  } else if (type === EventType.ACTION_PRESS && notification?.data?.uri && pressAction) {
    if (pressAction.id === "loc" && (await checkLocationPingsPermissions()) && (await DeviceInfo.isLocationEnabled())) {
      // start sending pings
      const lianeId = notification.data.liane as string;
      const liane = await new LianeServiceClient().get(lianeId);
      await sendLocationPings(liane.id!, liane.wayPoints);
    } else {
      await Linking.openURL(<string>notification.data.uri);
    }
  } else if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
    console.warn("[NOTIFEE]", type, pressAction?.id, notification?.data?.uri);
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
        actions: AndroidReminderActions,
        ongoing: true
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
          title: "Partager ma position",
          id: "loc"
        },
        {
          title: "J'ai du retard",
          foreground: true,
          id: "delay"
        }
      ]
    }
  ]);
}

export async function initializePushNotification(user: FullUser, authService: AuthService) {
  try {
    const pushToken = await PushNotifications?.getToken();
    if (pushToken && pushToken !== user.pushToken) {
      console.debug("[NOTIF]: New push token", pushToken);
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
    console.error("[NOTIF] Could not init push notifications", e);
  }
  return undefined;
})();
const openFirebaseNotification = (m: FirebaseMessagingTypes.RemoteMessage | null) => {
  if (!m) {
    return;
  }
  console.debug("[NOTIF] opened via", JSON.stringify(m));
  if (m?.data?.uri) {
    Linking.openURL(<string>m.data.uri);
  }
};

PushNotifications?.onNotificationOpenedApp(openFirebaseNotification);

export const checkInitialNotification = async (): Promise<string | undefined | null> => {
  const firebaseNotification = await PushNotifications?.getInitialNotification();
  if (firebaseNotification) {
    console.debug("[NOTIF] opened via", JSON.stringify(firebaseNotification));
    return firebaseNotification.data?.uri;
  }
  const n = await notifee.getInitialNotification();
  if (n) {
    console.debug("[NOTIF] opened via", JSON.stringify(n));

    if (n.notification.data?.uri) {
      if (n.pressAction.id === "loc" && (await checkLocationPingsPermissions()) && (await DeviceInfo.isLocationEnabled())) {
        // start sending pings
        const lianeId = n.notification.data.liane as string;
        const liane = await new LianeServiceClient().get(lianeId);
        await sendLocationPings(liane.id!, liane.wayPoints);
        return undefined;
      } else {
        return <string>n.notification.data?.uri;
      }
    }
  }
  const url = await Linking.getInitialURL();
  if (url) {
    console.debug("[DEEP LINK] opened with", url);
  }
  return url;
};
