import { PaginatedResponse } from "@/api";
import { BehaviorSubject, Observable, SubscriptionLike } from "rxjs";
import { Notification } from "@/api/notification";

export interface NotificationService {
  receiveNotification(notification: Notification): Promise<void>;

  checkInitialNotification(): Promise<void>;

  getInitialNotification(): Notification | undefined;

  list(): Promise<PaginatedResponse<Notification>>;

  markAsRead(notification: Notification): Promise<void>;

  initUnreadNotificationCount(initialCount: Observable<number>): void;

  unreadNotificationCount: Observable<number>;
}

export abstract class AbstractNotificationService implements NotificationService {
  protected initialNotification?: Notification;

  getInitialNotification = () => this.initialNotification;

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

  async receiveNotification(_: Notification) {
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() + 1);
  }

  abstract checkInitialNotification(): Promise<void>;

  abstract list(): Promise<PaginatedResponse<Notification>>;

  async markAsRead(_: Notification) {
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() - 1);
  }
}
