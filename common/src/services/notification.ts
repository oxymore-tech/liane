import { PaginatedResponse, Ref, User, UTCDateTime } from "../api";
import { BehaviorSubject, map, Observable, SubscriptionLike } from "rxjs";
import { HttpClient } from "./http";

export type Notification = {
  id: string;
  createdBy: Ref<User>;
  createdAt: UTCDateTime;
  recipients: Recipient[];
  title: string;
  message: string;
  uri?: string;
};

export type Recipient = {
  user: Ref<User>;
  readAt?: UTCDateTime;
};

export interface NotificationService {
  receiveNotification(notification: Notification): Promise<void>;

  list(cursor?: string | undefined): Promise<PaginatedResponse<Notification>>;

  markAsRead(notification: Ref<Notification>): Promise<void>;

  initUnreadNotifications(initialCount: Observable<Ref<Notification>[]>): void;

  closeNotification(): Promise<void>;

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

  protected resetCounter = async () => {
    this.unreadNotifications.next([]);
  };

  markAsRead = this.decrementCounter;
  closeNotification = this.resetCounter;

  receiveNotification = async (notification: Notification) => this.incrementCounter(notification.id!);
}

export class NotificationServiceClient extends AbstractNotificationService {
  constructor(protected http: HttpClient) {
    super();
  }

  async list(cursor?: string | undefined): Promise<PaginatedResponse<Notification>> {
    const paramString = cursor ? `?cursor=${cursor}` : "";
    return await this.http.get("/notification" + paramString);
  }

  override markAsRead = async (notification: Ref<Notification>) => {
    await this.http.patch(`/notification/${notification}`);
    await this.decrementCounter(notification);
  };

  override receiveNotification = async (notification: Notification): Promise<void> => {
    await this.incrementCounter(notification.id!);
  };
}
