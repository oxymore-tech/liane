import { PaginatedResponse, Ref } from "@/api";
import { BehaviorSubject, map, Observable, SubscriptionLike } from "rxjs";
import { Notification } from "@/api/notification";

export interface NotificationService {
  receiveNotification(notification: Notification, display?: boolean): Promise<void>;

  list(cursor?: string | undefined): Promise<PaginatedResponse<Notification>>;

  markAsRead(notification: Ref<Notification>): Promise<void>;

  initUnreadNotifications(initialCount: Observable<Ref<Notification>[]>): void;

  unreadNotificationCount: Observable<number>;
}

export abstract class AbstractNotificationService implements NotificationService {
  protected unreadNotifications = new BehaviorSubject<Ref<Notification>[]>([]);
  readonly unreadNotificationCount = this.unreadNotifications.pipe(map(ids => ids.length));
  protected _sub?: SubscriptionLike;

  initUnreadNotifications = (initialCount: Observable<Ref<Notification>[]>) => {
    if (this._sub) {
      this._sub.unsubscribe();
    }
    this._sub = initialCount.subscribe(ids => {
      this.unreadNotifications.next(ids);
    });
  };

  protected incrementCounter = async (id: Ref<Notification>) => {
    this.unreadNotifications.next([...this.unreadNotifications.getValue(), id]);
  };

  abstract list(): Promise<PaginatedResponse<Notification>>;

  protected decrementCounter = async (id: Ref<Notification>) => {
    this.unreadNotifications.next(this.unreadNotifications.getValue().filter(n => n !== id));
  };

  markAsRead = this.decrementCounter;

  receiveNotification = async (notification: Notification) => this.incrementCounter(notification.id!);
}
