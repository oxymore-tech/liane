import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import notifee, { EventType } from "@notifee/react-native";
import { FullUser, isJoinLianeRequest, Notification, PaginatedResponse } from "@/api";
import { get, patch } from "@/api/http";
import { AuthService } from "@/api/service/auth";
import { Platform } from "react-native";

export interface NotificationService {
  displayNotification: (notification: Notification<any>) => Promise<void>;

  checkInitialNotification: () => Promise<void>;

  initialNotification: () => Notification<any> | null | undefined;

  list: () => Promise<PaginatedResponse<Notification<any>>>;

  read: (notificationId: string) => Promise<void>;
}

const DefaultChannelId = "liane_default";
async function onMessageReceived(message: FirebaseMessagingTypes.RemoteMessage) {
  console.log("received push", JSON.stringify(message));
  if (!message.notification) {
    return;
  }
  const { title, body } = message.notification;
  return await notifee.displayNotification({
    android: {
      channelId: DefaultChannelId,
      pressAction: {
        id: "default"
      },
      smallIcon: "ic_notification"
    },
    title,
    body
  });
}

// Called when notification is pressed
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  console.debug(JSON.stringify(detail));

  // Check if the user pressed the "Mark as read" action
  if (notification && type === EventType.ACTION_PRESS && pressAction?.id === "mark-as-read") {
    // Update external API
    console.debug("n pressed");

    // Remove the notification
    await notifee.cancelNotification(notification.id!);
  }
});
async function displayNotifeeNotification(notification: Notification<any>) {
  let title: string;
  let body: string;
  if (isJoinLianeRequest(notification)) {
    title = "Nouvelle demande";
    body = `Un nouveau ${notification.event.seats > 0 ? "conducteur" : "passager"} voudrait rejoindre votre Liane.`;
  } else {
    // Unknown type
    console.debug("unknown notification", JSON.stringify(notification));
    title = "Nouveau message";
    body = `Test`;
    //return;
  }

  await notifee.displayNotification({
    android: {
      channelId: DefaultChannelId,
      pressAction: {
        id: "default"
      },
      smallIcon: "ic_notification",
      largeIcon: "ic_launcher"
    },
    title,
    body
  });
}

export async function initializeNotification() {
  // Request permissions (required for iOS)
  await notifee.requestPermission();

  // Create a channel (required for Android)
  await notifee.createChannel({
    id: DefaultChannelId,
    name: "Default Channel"
  });
}

export async function initializePushNotification(user: FullUser, authService: AuthService) {
  try {
    const pushToken = await PushNotifications?.getToken();
    if (pushToken && pushToken !== user.pushToken) {
      console.debug("New push token:", pushToken);
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
    console.debug("Counld not init push notifications", e);
  }
  return undefined;
})();

PushNotifications?.setBackgroundMessageHandler(onMessageReceived);
export class NotificationServiceClient implements NotificationService {
  private _initialNotification = undefined;
  initialNotification = () => this._initialNotification;
  displayNotification = displayNotifeeNotification;

  async checkInitialNotification(): Promise<void> {
    const m = await PushNotifications?.getInitialNotification();
    console.debug("opened via", JSON.stringify(m));
    const n = await notifee.getInitialNotification();
    console.debug("opened via", JSON.stringify(n));
  }

  async list(): Promise<PaginatedResponse<Notification<any>>> {
    return await get(`/user/notification`);
  }

  async read(notificationId: string): Promise<void> {
    await patch("user/notification/" + notificationId);
  }
}
