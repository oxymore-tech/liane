import {
  ChatMessage,
  ConversationGroup,
  FullUser,
  Liane,
  PaginatedRequestParams,
  PaginatedResponse,
  Ref,
  TrackedMemberLocation,
  UTCDateTime
} from "@/api";
import { BehaviorSubject, Observable, Subject, SubscriptionLike } from "rxjs";
import { Answer, Notification } from "@/api/notification";
import { LianeEvent } from "@/api/event";

export type HubState = "online" | "reconnecting" | "offline";
export interface HubService {
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
  updateActiveState(active: boolean): void;
  readConversation(conversation: Ref<ConversationGroup>, timestamp: UTCDateTime): Promise<void>;
  subscribeToPosition(lianeId: string, memberId: string, callback: OnLocationCallback): Promise<SubscriptionLike>;

  unreadConversations: Observable<Ref<ConversationGroup>[]>;
  unreadNotificationCount: Observable<number>;
  lianeUpdates: Observable<Liane>;

  hubState: Observable<HubState>;
}

export type ConsumeMessage = (res: ChatMessage) => void;

export type Disconnect = () => Promise<void>;
export type OnLatestMessagesCallback = (res: PaginatedResponse<ChatMessage>) => void;
export type OnNotificationCallback = (n: Notification) => void;
export type OnLocationCallback = (l: TrackedMemberLocation) => void;

type UnreadOverview = Readonly<{
  notificationsCount: number;
  conversations: Ref<ConversationGroup>[];
}>;

export abstract class AbstractHubService implements HubService {
  protected currentConversationId?: string = undefined;
  readonly unreadConversations: BehaviorSubject<Ref<ConversationGroup>[]> = new BehaviorSubject<Ref<ConversationGroup>[]>([]);
  protected readonly notificationSubject: Subject<Notification> = new Subject<Notification>();
  lianeUpdates = new Subject<Liane>();
  unreadNotificationCount = new BehaviorSubject<number>(0);
  hubState = new Subject<HubState>();
  protected onReceiveLatestMessagesCallback: OnLatestMessagesCallback | null = null;
  // Sets a callback to receive messages after joining a conversation.
  // This callback will be automatically disposed of when closing conversation.
  protected onReceiveMessageCallback: ConsumeMessage | null = null;
  protected onReceiveLocationUpdateCallback: OnLocationCallback | null = null;
  protected appStateActive: boolean = true;

  protected receiveMessage = async (convId: string, message: ChatMessage) => {
    // Called when receiving a message inside current conversation
    console.debug("[HUB] received : msg", this.appStateActive, convId, message, this.currentConversationId);
    if (!this.appStateActive) {
      return false;
    }
    if (this.currentConversationId === convId && this.onReceiveMessageCallback) {
      this.onReceiveMessageCallback(message);
      return true;
    } else if (!this.unreadConversations.getValue().includes(convId)) {
      this.unreadConversations.next([...this.unreadConversations.getValue(), convId]);
      return false;
    }
  };

  protected receiveUnreadOverview = async (unread: UnreadOverview) => {
    // Called when hub is started
    console.debug("[HUB] unread", unread);
    this.unreadConversations.next(unread.conversations);
    this.unreadNotificationCount.next(unread.notificationsCount);
  };

  protected receiveNotification = async (notification: Notification) => {
    // Called on new notification
    if (__DEV__) {
      console.debug("[HUB] received :", this.appStateActive, notification);
    }
    if (this.appStateActive) {
      this.notificationSubject.next(notification);
      return true;
    }
    return false;
  };

  protected receiveLatestMessages = async (messages: PaginatedResponse<ChatMessage>) => {
    // Called after joining a conversation
    if (this.onReceiveLatestMessagesCallback) {
      this.onReceiveLatestMessagesCallback(messages);
    }
  };

  subscribeToNotifications = (callback: OnNotificationCallback) => this.notificationSubject.subscribe(callback);

  abstract list(id: Ref<ConversationGroup>, params: PaginatedRequestParams): Promise<PaginatedResponse<ChatMessage>>;

  abstract start(): Promise<FullUser>;
  abstract stop(): Promise<void>;

  updateActiveState(active: boolean) {
    this.appStateActive = active;
  }

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
    console.debug("[HUB] joined " + conv.id);
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
      console.debug("[HUB] left " + this.currentConversationId);
      this.currentConversationId = undefined;
    } else if (__DEV__) {
      console.debug("[HUB] Tried to leave an undefined conversation.");
    }
  };

  send = async (message: ChatMessage): Promise<void> => {
    if (this.currentConversationId) {
      try {
        await this.sendToGroup(message);
      } catch (e) {
        if (__DEV__) {
          console.warn(`[HUB] Could not send message : ${JSON.stringify(message)}`, e);
        }
      }
    } else {
      throw new Error("Could not send message to undefined conversation");
    }
  };

  protected receiveLocationUpdateCallback: OnLocationCallback = l => {
    if (this.onReceiveLocationUpdateCallback) {
      this.onReceiveLocationUpdateCallback(l);
    }
  };

  protected receiveLianeUpdate = (liane: Liane) => {
    this.lianeUpdates.next(liane);
  };

  abstract readConversation(conversation: Ref<ConversationGroup>, timestamp: UTCDateTime): Promise<void>;
  abstract sendToGroup(message: ChatMessage): Promise<void>;
  abstract joinGroupChat(conversationId: Ref<ConversationGroup>): Promise<ConversationGroup>;
  abstract postEvent(lianeEvent: LianeEvent): Promise<void>;
  abstract postAnswer(notificationId: string, answer: Answer): Promise<void>;
  abstract subscribeToPosition(lianeId: string, memberId: string, callback: OnLocationCallback): Promise<SubscriptionLike>;
}
