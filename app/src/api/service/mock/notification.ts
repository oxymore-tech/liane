import { PaginatedResponse } from "@/api";
import { AbstractNotificationService } from "@/api/service/interfaces/notification";
import { Notification } from "@/api/notification";

export class NotificationServiceMock extends AbstractNotificationService {
  constructor(unreadNotificationsCount: number = 0) {
    super();
    const notifications: Notification[] = [];
    for (let i = 0; i < unreadNotificationsCount; i++) {
      const message = "Initial_" + i;
      notifications.push({
        type: "Info",
        id: i.toString(),
        title: "Test",
        message,
        sentAt: new Date().toISOString(),
        recipients: [],
        answers: []
      });
    }
    this.notifications = notifications;
  }
  private notifications: Notification[] = [];

  async markAsRead(notification: Notification) {
    this.notifications = this.notifications.map(n => {
      if (n.id === notification.id) {
        n = { ...n, recipients: n.recipients.map(r => ({ ...r, seenAt: new Date().toISOString() })) };
      }
      return n;
    });
  }

  async list(): Promise<PaginatedResponse<Notification>> {
    return { data: this.notifications, pageSize: this.notifications.length };
  }

  checkInitialNotification(): Promise<void> {
    return Promise.resolve();
  }
}
