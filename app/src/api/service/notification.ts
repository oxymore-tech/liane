import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import notifee, { EventType } from "@notifee/react-native";
import { FullUser, isJoinLianeRequest, Notification, PaginatedResponse, User } from "@/api";
import { get, patch } from "@/api/http";
import { AuthService } from "@/api/service/auth";
import { Platform } from "react-native";
import { NavigationContainerRefWithCurrent, NavigationProp } from "@react-navigation/native";

export interface NotificationService {
  displayNotification: (notification: Notification<any>) => Promise<void>;

  checkInitialNotification: () => Promise<void>;

  initialNotification: () => Notification<any> | null | undefined;

  list: () => Promise<PaginatedResponse<Notification<any>>>;

  read: (notificationId: string) => Promise<void>;
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
  console.log("received push", JSON.stringify(message));
  if (!message.notification) {
    return;
  }
  const { title, body } = message.notification;
  return await notifee.displayNotification({
    android: DefaultAndroidSettings,
    title,
    body
  });
}

// Called when notification is pressed
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  console.debug(JSON.stringify(detail));
  /*
  // Check if the user pressed the "Mark as read" action
  if (notification && type === EventType.ACTION_PRESS && pressAction?.id === "mark-as-read") {
    // Update external API
    console.debug("n pressed");

    // Remove the notification
    await notifee.cancelNotification(notification.id!);
  }*/
});
async function displayNotifeeNotification(notification: Notification<any>) {
  let data = getNotificationContent(notification);

  await notifee.displayNotification({
    android: DefaultAndroidSettings,
    title: data.title,
    body: data.body
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

export type NotificationData = {
  title: string;
  body: string;
  navigate: (navigation: NavigationProp<any> | NavigationContainerRefWithCurrent<any>) => void;
};
export const getNotificationContent = (notification: Notification<any>, me: User) => {
  let d: NotificationData = {};
  if (isJoinLianeRequest(notification)) {
    if (notification.event.accepted) {
      if (notification.event.createdBy === me.id) {
        d.title = "Demande acceptée";
        d.body = "Vous avez rejoint une nouvelle Liane.";
      } else {
        d.title = "Nouveau membre";
        d.body = `Un nouveau ${notification.event.seats > 0 ? "conducteur" : "passager"} a rejoint votre Liane.`;
      }
      d.navigate = navigation => navigation.navigate("LianeDetail", { liane: notification.event.targetLiane });
      return d;
    } else {
      d.title = "Nouvelle demande";
      d.body = `Un nouveau ${notification.event.seats > 0 ? "conducteur" : "passager"} voudrait rejoindre votre Liane.`;
      d.navigate = navigation => navigation.navigate("OpenJoinLianeRequest", { request: notification.event });
      return d;
    }
  }
  // Unknown type
  console.debug("untreated notification", JSON.stringify(notification));
  d.body = "TODO " + notification.type;
  d.title = "Nouvelle notification";
  d.navigate = () => {};
  return d;
};
