import { ChatMessage, ConversationGroup, PaginatedResponse, Ref, User } from "@/api";
import { delay, interval, Subject, SubscriptionLike, take } from "rxjs";
import { AbstractHubService } from "@/api/service/interfaces/hub";

export class HubServiceMock extends AbstractHubService {
  private messages: ChatMessage[] = [];
  private messageSubject: Subject<ChatMessage> = new Subject<ChatMessage>();

  async list(): Promise<PaginatedResponse<ChatMessage>> {
    return { pageSize: this.messages.length, data: this.messages };
  }

  readonly mockMe: User = {
    id: "00000",
    phone: "0600000000",
    pseudo: "John Doe"
  };

  readonly mockOther: User = {
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
  start = async (): Promise<User> => {
    await this.receiveUnreadOverview({ notificationsCount: this.unreadNotificationsCount, conversations: [] });
    // Emit notifications
    await new Promise(resolve => setTimeout(resolve, this.notificationEmitter.delay));
    interval(this.notificationEmitter.delay)
      .pipe(take(this.notificationEmitter.count))
      .subscribe(counter => {
        const now = new Date();
        const msg = `This is the ${counter}th test.`;
        this.notificationSubject.next({
          _t: "Info",
          title: "Test",
          message: msg,
          sentAt: now.toISOString(),
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
}
