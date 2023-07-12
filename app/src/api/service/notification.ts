import notifee, { EventType } from "@notifee/react-native";
import { FullUser, PaginatedResponse } from "@/api";
import { get, patch } from "@/api/http";
import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { AuthService } from "@/api/service/auth";
import { Platform } from "react-native";
import { AbstractNotificationService } from "@/api/service/interfaces/notification";
import { Notification } from "@/api/notification";
import { getNotificationNavigation } from "@/api/navigation";

export class NotificationServiceClient extends AbstractNotificationService {
  async list(): Promise<PaginatedResponse<Notification>> {
    return await get("/notification");
  }
  markAsRead = async (notification: Notification) => {
    // TODO find out how to use super
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() - 1);
    await patch(`/notification/${notification.id}`);
  };

  checkInitialNotification = async (): Promise<void> => {
    if (initialPushNotification) {
      this.initialNotification = initialPushNotification;
      return;
    }
    const n = await notifee.getInitialNotification();
    if (n && n.notification.data?.jsonPayload) {
      this.initialNotification = JSON.parse(<string>n.notification.data!.jsonPayload);
      console.debug("[NOTIF] opened via", JSON.stringify(n));
    }
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

// Called when notification is pressed and app is open
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  console.debug("[NOTIFEE]", JSON.stringify(detail));

  // Check if the user pressed the "Mark as read" action
  if (notification && type === EventType.ACTION_PRESS && pressAction?.id === "mark-as-read") {
    // Remove the notification
    await notifee.cancelNotification(notification.id!);
  }
  if (notification && type === EventType.ACTION_PRESS && pressAction?.id === "default") {
    getNotificationNavigation(notification.data as Notification);
  }
});

async function displayNotifeeNotification(notification: Notification) {
  await notifee.displayNotification({
    android: DefaultAndroidSettings,
    title: notification.title,
    body: notification.message,
    data: notification
  });
}

export async function initializeNotification() {
  // Request permissions (required for iOS)
  await notifee.requestPermission();

  // Create a channel (required for Android)
  await notifee.createChannel({
    id: DefaultChannelId,
    name: "Général"
  });
}

export async function initializePushNotification(user: FullUser, authService: AuthService) {
  try {
    const pushToken = await PushNotifications?.getToken();
    if (pushToken && pushToken !== user.pushToken) {
      console.debug("[NOTIF]: New push token", pushToken);
      // Update server's token
      await authService.updatePushToken(pushToken);
    }
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
    console.error("[NOTIF] Counld not init push notifications", e);
  }
  return undefined;
})();

let initialPushNotification: Notification | undefined;
const setInitialPushNotification = (m: FirebaseMessagingTypes.RemoteMessage | null) => {
  if (m && m.data?.jsonPayload) {
    console.debug("[NOTIF] opened via", JSON.stringify(m));
    initialPushNotification = JSON.parse(m.data!.jsonPayload);
  }
  return Promise.resolve();
};

PushNotifications?.onNotificationOpenedApp(setInitialPushNotification);
//PushNotifications?.setBackgroundMessageHandler(setInitialPushNotification);
PushNotifications?.getInitialNotification()?.then(setInitialPushNotification);
