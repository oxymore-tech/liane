import { ChatMessage, ConversationGroup, FullUser, PaginatedRequestParams, PaginatedResponse, Ref } from "@/api";
import { BehaviorSubject, Observable, Subject, SubscriptionLike } from "rxjs";
import { Answer, Notification } from "@/api/notification";
import { LianeEvent } from "@/api/event";

export interface ChatHubService {
  list(id: Ref<ConversationGroup>, params: PaginatedRequestParams): Promise<PaginatedResponse<ChatMessage>>;
  send(message: ChatMessage): Promise<void>;
  stop(): Promise<void>;
  start(): Promise<FullUser>;
  connectToChat(
    conversation: Ref<ConversationGroup>,
    onReceiveLatestMessages: OnLatestMessagesCallback,
    onReceiveMessage: ConsumeMessage
  ): Promise<ConversationGroup>;
  disconnectFromChat(conversation: Ref<ConversationGroup>): Promise<void>;
  subscribeToNotifications(callback: OnNotificationCallback): SubscriptionLike;
  postEvent(lianeEvent: LianeEvent): Promise<void>;
  postAnswer(notificationId: string, answer: Answer): Promise<void>;

  unreadConversations: Observable<Ref<ConversationGroup>[]>;

  unreadNotificationCount: Observable<number>;
}

export type ConsumeMessage = (res: ChatMessage) => void;

export type Disconnect = () => Promise<void>;
export type OnLatestMessagesCallback = (res: PaginatedResponse<ChatMessage>) => void;
export type OnNotificationCallback = (n: Notification) => void;

type UnreadOverview = Readonly<{
  notificationsCount: number;
  conversations: Ref<ConversationGroup>[];
}>;

export abstract class AbstractHubService implements ChatHubService {
  protected currentConversationId?: string = undefined;
  readonly unreadConversations: BehaviorSubject<Ref<ConversationGroup>[]> = new BehaviorSubject<Ref<ConversationGroup>[]>([]);
  protected readonly notificationSubject: Subject<Notification> = new Subject<Notification>();

  unreadNotificationCount = new BehaviorSubject<number>(0);

  protected onReceiveLatestMessagesCallback: OnLatestMessagesCallback | null = null;
  // Sets a callback to receive messages after joining a conversation.
  // This callback will be automatically disposed of when closing conversation.
  protected onReceiveMessageCallback: ConsumeMessage | null = null;

  protected receiveMessage = async (convId: string, message: ChatMessage) => {
    // Called when receiving a message inside current conversation
    console.debug("received msg", convId, message, this.currentConversationId);
    if (this.currentConversationId === convId && this.onReceiveMessageCallback) {
      await this.onReceiveMessageCallback(message);
    } else if (!this.unreadConversations.getValue().includes(convId)) {
      this.unreadConversations.next([...this.unreadConversations.getValue(), convId]);
    }
  };

  protected receiveUnreadOverview = async (unread: UnreadOverview) => {
    // Called when hub is started
    console.log("unread", unread);
    this.unreadConversations.next(unread.conversations);
    this.unreadNotificationCount.next(unread.notificationsCount);
  };

  protected receiveNotification = async (notification: Notification) => {
    // Called on new notification
    if (__DEV__) {
      console.log("received:", notification, this.notificationSubject);
    }
    this.notificationSubject.next(notification);
  };

  protected receiveLatestMessages = async (messages: PaginatedResponse<ChatMessage>) => {
    // Called after joining a conversation
    if (this.onReceiveLatestMessagesCallback) {
      await this.onReceiveLatestMessagesCallback(messages);
    }
  };

  subscribeToNotifications = (callback: OnNotificationCallback) => this.notificationSubject.subscribe(callback);

  abstract list(id: Ref<ConversationGroup>, params: PaginatedRequestParams): Promise<PaginatedResponse<ChatMessage>>;

  abstract start(): Promise<FullUser>;
  abstract stop(): Promise<void>;

  connectToChat = async (
    conversationRef: Ref<ConversationGroup>,
    onReceiveLatestMessages: OnLatestMessagesCallback,
    onReceiveMessage: ConsumeMessage
  ): Promise<ConversationGroup> => {
    if (this.currentConversationId) {
      await this.disconnectFromChat(this.currentConversationId);
    }
    this.onReceiveLatestMessagesCallback = onReceiveLatestMessages;
    this.onReceiveMessageCallback = onReceiveMessage;
    const conv: ConversationGroup = await this.joinGroupChat(conversationRef);
    console.log("joined " + conv.id);
    this.currentConversationId = conv.id;
    // Remove from unread conversations
    if (this.unreadConversations.getValue().includes(conversationRef)) {
      this.unreadConversations.next(this.unreadConversations.getValue().filter(c => c !== conversationRef));
    }

    return conv;
  };

  disconnectFromChat = async (_: Ref<ConversationGroup>): Promise<void> => {
    if (this.currentConversationId) {
      this.onReceiveLatestMessagesCallback = null;
      this.onReceiveMessageCallback = null;
      await this.leaveGroupChat();
      console.log("left " + this.currentConversationId);
      this.currentConversationId = undefined;
    } else if (__DEV__) {
      console.log("Tried to leave an undefined conversation.");
    }
  };

  send = async (message: ChatMessage): Promise<void> => {
    console.log("send");
    if (this.currentConversationId) {
      try {
        await this.sendToGroup(message);
      } catch (e) {
        if (__DEV__) {
          console.log(`Could not send message : ${JSON.stringify(message)}`, e);
        }
      }
    } else {
      throw new Error("Could not send message to undefined conversation");
    }
  };

  abstract leaveGroupChat(): Promise<void>;
  abstract sendToGroup(message: ChatMessage): Promise<void>;
  abstract joinGroupChat(conversationId: Ref<ConversationGroup>): Promise<ConversationGroup>;
  abstract postEvent(lianeEvent: LianeEvent): Promise<void>;
  abstract postAnswer(notificationId: string, answer: Answer): Promise<void>;
}
