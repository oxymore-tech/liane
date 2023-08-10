import { PaginatedResponse } from "@/api";
import { BehaviorSubject, Observable, SubscriptionLike } from "rxjs";
import { Notification } from "@/api/notification";

export interface NotificationService {
  receiveNotification(notification: Notification, display?: boolean): Promise<void>;

  list(): Promise<PaginatedResponse<Notification>>;

  markAsRead(notification: Notification): Promise<void>;

  initUnreadNotificationCount(initialCount: Observable<number>): void;

  unreadNotificationCount: Observable<number>;
}

export abstract class AbstractNotificationService implements NotificationService {
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
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() + 1);
  };

  abstract list(): Promise<PaginatedResponse<Notification>>;

  markAsRead = async (_: Notification) => {
    if (this.unreadNotificationCount.getValue() - 1 < 0) {
      console.warn("Read count < 0");
      return;
    }
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() - 1);
  };
}
