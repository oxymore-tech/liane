import { Notification, NotificationPayload, PaginatedResponse } from "@/api";
import { BehaviorSubject, Observable, SubscriptionLike } from "rxjs";
export interface NotificationService {
  receiveNotification: (notification: Notification) => Promise<void>;

  checkInitialNotification: () => Promise<void>;

  initialNotification: () => NotificationPayload<any> | null | undefined;

  list: () => Promise<PaginatedResponse<Notification>>;

  read: (notification: NotificationPayload<any>) => Promise<boolean>;
  initUnreadNotificationCount: (initialCount: Observable<number>) => void;
  unreadNotificationCount: Observable<number>;
}

export abstract class AbstractNotificationService implements NotificationService {
  protected _initialNotification = undefined;

  protected _readNotifications: string[] = [];
  initialNotification = () => this._initialNotification;
  unreadNotificationCount: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  protected _sub?: SubscriptionLike;

  initUnreadNotificationCount = (initialCount: Observable<number>) => {
    if (this._sub) {
      this._sub.unsubscribe();
    }
    this._sub = initialCount.subscribe(count => {
      this.unreadNotificationCount.next(count);
    });
  };
  receiveNotification = async (_: Notification) => {
    // Increment counter
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() + 1);
  };
  abstract checkInitialNotification(): Promise<void>;
  abstract list(): Promise<PaginatedResponse<Notification>>;

  read = async (notification: NotificationPayload<any>): Promise<boolean> => {
    if (!notification.seen && !this._readNotifications.includes(notification.id!)) {
      this._readNotifications.push(notification.id!);
      await this.changeSeenStatus(notification.id!);
      // Decrement counter
      this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() - 1);
      return true;
    }
    return false;
  };
  abstract changeSeenStatus(notificationId: string): Promise<void>;
}
