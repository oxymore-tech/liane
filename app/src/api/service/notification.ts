import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import notifee from "@notifee/react-native";

export interface NotificationService {}

async function onMessageReceived(message: FirebaseMessagingTypes.RemoteMessage) {
  if (!message.notification) {
    return;
  }
  const { title, body } = message.notification;
  return await notifee.displayNotification({
    android: {
      channelId: "default",
      pressAction: {
        id: "default"
      }
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
    id: "default",
    name: "Default Channel"
  });

  messaging().onMessage(onMessageReceived);
  messaging().setBackgroundMessageHandler(onMessageReceived);
}

export class NotificationServiceClient implements NotificationService {}
