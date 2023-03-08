import { ChatHubService, OnLatestMessagesCallback, ConsumeMessage, Disconnect } from "@/api/service/chat";
import { ChatMessage, ConversationGroup, PaginatedRequestParams, PaginatedResponse, User, Ref, NotificationPayload } from "@/api";
import { BehaviorSubject, delay, of, Subject, SubscriptionLike } from "rxjs";

export class HubServiceMock implements ChatHubService {
  readonly unreadConversations = new BehaviorSubject([]);
  readonly unreadNotificationCount = new BehaviorSubject(0);
  private messages: ChatMessage[] = [];
  private messageSubject: Subject<ChatMessage> = new Subject<ChatMessage>();
  async list(id: Ref<ConversationGroup>, params: PaginatedRequestParams): Promise<PaginatedResponse<ChatMessage>> {
    return { pageSize: this.messages.length, data: this.messages };
  }
  async send(message: ChatMessage): Promise<void> {
    this.messages.push({ id: this.messages.length.toString(), createdBy: this.mockMe.id, createdAt: new Date().toISOString(), ...message });
    const reply = { id: this.messages.length.toString() + 1, createdBy: this.mockOther.id, createdAt: new Date().toISOString(), ...message };
    this.messages.push(reply);
    this.messageSubject.next(reply);
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
      { user: this.mockOther.id, joinedAt: "", lastReadAt: "" },
      { user: this.mockMe.id, joinedAt: "", lastReadAt: "" }
    ]
  };
  start(): Promise<User> {
    return Promise.resolve(this.mockMe);
  }
  stop(): Promise<void> {
    return Promise.resolve(undefined);
  }
  connectToChat(
    conversation: Ref<ConversationGroup>,
    onReceiveLatestMessages: OnLatestMessagesCallback,
    onReceiveMessage: ConsumeMessage
  ): Promise<[ConversationGroup, Disconnect]> {
    //TODO mock conversation
    this.messages = [];
    onReceiveLatestMessages({ pageSize: this.messages.length, data: this.messages });
    const sub = this.messageSubject.pipe(delay(1000)).subscribe(m => {
      onReceiveMessage(m);
    });
    return Promise.resolve([
      this.mockConversation,
      async () => {
        sub.unsubscribe();
      }
    ]);
  }
  subscribeToNotifications(callback: (n: NotificationPayload<any>) => void): SubscriptionLike {
    return of("test1", "test2 ongoing", "Test3 is the last test.")
      .pipe(delay(30000))
      .subscribe(msg => {
        callback({ type: "String", id: msg, event: msg });
      });
  }
}
