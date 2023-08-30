import { PaginatedResponse, Ref } from "@/api";
import { BehaviorSubject, Observable, SubscriptionLike } from "rxjs";
import { Notification } from "@/api/notification";

export interface NotificationService {
  receiveNotification(notification: Notification, display?: boolean): Promise<void>;

  list(cursor?: string | undefined): Promise<PaginatedResponse<Notification>>;

  markAsRead(notification: Ref<Notification>): Promise<void>;

  initUnreadNotificationCount(initialCount: Observable<number>): void;

  unreadNotificationCount: Observable<number>;
}

export abstract class AbstractNotificationService implements NotificationService {
  readonly unreadNotificationCount: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  protected _sub?: SubscriptionLike;

  initUnreadNotificationCount = (initialCount: Observable<number>) => {
    if (this._sub) {
      this._sub.unsubscribe();
    }
    this._sub = initialCount.subscribe(count => {
      this.unreadNotificationCount.next(count);
    });
  };

  protected incrementCounter = async (_: Ref<Notification>) => {
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() + 1);
  };

  abstract list(): Promise<PaginatedResponse<Notification>>;

  protected decrementCounter = async (_: Ref<Notification>) => {
    if (this.unreadNotificationCount.getValue() - 1 < 0) {
      console.warn("Read count < 0");
      return;
    }
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() - 1);
  };

  markAsRead = this.decrementCounter;

  receiveNotification = async (notification: Notification) => this.incrementCounter(notification.id!);
}
