import { AbstractHubService, HubService } from "@/api/service/interfaces/hub";
import { AbstractNotificationService, NotificationService } from "@/api/service/interfaces/notification";
import { ChatMessage, ConversationGroup, FullUser, PaginatedResponse, Ref, User } from "@/api";
import { delay, interval, Subject, SubscriptionLike, firstValueFrom, take, toArray } from "rxjs";
import { Notification } from "@/api/notification";

describe("notifications counter", () => {
  const initServices = async (): Promise<{ notification: NotificationService; chatHub: HubService }> => {
    const services = {
      notification: new NotificationServiceMock(1) as NotificationService,
      chatHub: new HubServiceMock(1, { delay: 200, count: 1 }) as HubService
    };
    await services.chatHub.start();
    services.notification.initUnreadNotificationCount(services.chatHub.unreadNotificationCount);
    return services;
  };

  test("initial counter should be 1", async () => {
    const services = await initServices();

    await expect(firstValueFrom(services.notification.unreadNotificationCount)).resolves.toEqual(1);
  });

  test("counter should be 0 after read", async () => {
    const services = await initServices();
    const notifications = await services.notification.list();
    expect(notifications.pageSize).toEqual(1);
    let counter = 1;
    const sub = services.notification.unreadNotificationCount.subscribe(v => (counter = v));

    // Read notification
    const notification = notifications.data[0];
    await services.notification.markAsRead(notification.id!);
    expect(counter).toEqual(0);

    // Read same notification again
    await services.notification.markAsRead(notification.id!);
    expect(counter).toEqual(0);
    sub.unsubscribe();
  });

  test("counter should increment", async () => {
    const services = await initServices();
    const observable = services.notification.unreadNotificationCount.pipe(take(2), toArray());
    services.chatHub.subscribeToNotifications(services.notification.receiveNotification);

    await expect(firstValueFrom(observable)).resolves.toEqual([1, 2]);
  });
});

export class HubServiceMock extends AbstractHubService {
  private messages: ChatMessage[] = [];
  private messageSubject: Subject<ChatMessage> = new Subject<ChatMessage>();

  async list(): Promise<PaginatedResponse<ChatMessage>> {
    return { pageSize: this.messages.length, data: this.messages };
  }

  readonly mockMe: FullUser = {
    firstName: "John",
    lastName: "Doe",
    gender: "Unspecified",
    pictureUrl: undefined,
    id: "00000",
    phone: "0600000000",
    pseudo: "John Doe"
  };

  readonly mockOther: User = {
    gender: "Woman",
    pictureUrl: undefined,
    id: "000002",
    phone: "0600000002",
    pseudo: "Jane Doe"
  };

  readonly mockConversation: ConversationGroup = {
    id: "1",
    members: [
      { user: this.mockOther, joinedAt: "", lastReadAt: "" },
      { user: this.mockMe, joinedAt: "", lastReadAt: "" }
    ]
  };

  private readonly unreadNotificationsCount: number;
  private readonly notificationEmitter: { delay: number; count: number };
  constructor(unreadNotificationsCount: number = 0, notificationEmitter: { delay: number; count: number } = { delay: 5000, count: 1 }) {
    super();
    this.unreadNotificationsCount = unreadNotificationsCount;
    this.notificationEmitter = notificationEmitter;
  }
  start = async (): Promise<FullUser> => {
    await this.receiveUnreadOverview({ notificationsCount: this.unreadNotificationsCount, conversations: [] });
    // Emit notifications
    await new Promise(resolve => setTimeout(resolve, this.notificationEmitter.delay));
    interval(this.notificationEmitter.delay)
      .pipe(take(this.notificationEmitter.count))
      .subscribe(counter => {
        const now = new Date();
        const msg = `This is the ${counter}th test.`;
        this.notificationSubject.next({
          type: "Info",
          title: "Test",
          message: msg,
          createdAt: now.toISOString(),
          createdBy: this.mockMe.id!,
          recipients: [],
          answers: []
        });
      });

    return this.mockMe;
  };
  stop(): Promise<void> {
    return Promise.resolve();
  }

  private _sub: SubscriptionLike | undefined = undefined;
  joinGroupChat = (conversationId: Ref<ConversationGroup>): Promise<ConversationGroup> => {
    this.messages = [];
    this.onReceiveLatestMessagesCallback!({ pageSize: this.messages.length, data: this.messages });
    this._sub = this.messageSubject.pipe(delay(1000)).subscribe(m => {
      this.onReceiveMessageCallback!(m);
    });
    return Promise.resolve({ ...this.mockConversation, id: conversationId });
  };
  leaveGroupChat = async (): Promise<void> => {
    this._sub?.unsubscribe();
  };
  sendToGroup = async (message: ChatMessage): Promise<void> => {
    this.messages.push({ id: this.messages.length.toString(), createdBy: this.mockMe.id, createdAt: new Date().toISOString(), ...message });
    const reply = { id: this.messages.length.toString() + 1, createdBy: this.mockOther.id, createdAt: new Date().toISOString(), ...message };
    this.messages.push(reply);
    this.messageSubject.next(reply);
  };

  postEvent(): Promise<void> {
    return Promise.resolve(undefined);
  }

  postAnswer(): Promise<void> {
    return Promise.resolve(undefined);
  }
  readConversation(): Promise<void> {
    return Promise.reject();
  }
  subscribeToPosition(): Promise<SubscriptionLike> {
    return Promise.reject();
  }
}

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
        createdAt: new Date().toISOString(),
        createdBy: "me",
        recipients: [],
        answers: []
      });
    }
    this.notifications = notifications;
  }
  private notifications: Notification[] = [];

  override markAsRead = async (notification: Ref<Notification>) => {
    this.notifications = this.notifications.map(n => {
      if (n.id === notification) {
        n = { ...n, recipients: n.recipients.map(r => ({ ...r, seenAt: new Date().toISOString() })) };
      }
      return n;
    });
    await this.decrementCounter(notification);
  };

  async list(): Promise<PaginatedResponse<Notification>> {
    return { data: this.notifications, pageSize: this.notifications.length };
  }

  checkInitialNotification(): Promise<void> {
    return Promise.resolve();
  }
}
