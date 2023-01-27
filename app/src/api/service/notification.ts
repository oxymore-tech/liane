import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import notifee from "@notifee/react-native";

export interface NotificationService {}

function onMessageReceived(message: FirebaseMessagingTypes.RemoteMessage) {
  return notifee.displayNotification(message);
}

export function initializeNotification(): void {
  messaging().onMessage(onMessageReceived);
  messaging().setBackgroundMessageHandler(onMessageReceived);
}

export class NotificationServiceClient implements NotificationService {}
