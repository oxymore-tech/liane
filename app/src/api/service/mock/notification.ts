import { Notification, PaginatedResponse } from "@/api";
import { AbstractNotificationService } from "@/api/service/interfaces/notification";

export class NotificationServiceMock extends AbstractNotificationService {
  constructor(unreadNotificationsCount: number = 0) {
    super();
    let notifications = [];
    for (let i = 0; i < unreadNotificationsCount; i++) {
      const message = "Initial_" + i;
      notifications.push({
        _t: "Info",
        title: "Test",
        message,
        payload: { event: message, id: i.toString(), seen: false, createdAt: new Date().toISOString() }
      });
    }
    this.notifications = notifications;
  }
  private notifications: Notification[] = [];
  /*override receiveNotification = async (notification: Notification) => {
    this.notifications.push(notification);
    await super.receiveNotification(notification);
  };*/
  changeSeenStatus = async (notificationId: string) => {
    this.notifications = this.notifications.map(n => {
      if (n.payload.id === notificationId) {
        n = { ...n, payload: { ...n.payload, seen: true } };
      }
      return n;
    });
  };
  list = async (): Promise<PaginatedResponse<Notification>> => {
    return { data: this.notifications, pageSize: this.notifications.length };
  };
  checkInitialNotification(): Promise<void> {
    return Promise.resolve();
  }
}
