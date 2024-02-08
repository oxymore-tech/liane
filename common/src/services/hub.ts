import { ChatMessage, ConversationGroup, FullUser, Liane, PaginatedRequestParams, PaginatedResponse, Ref, TrackingInfo, UTCDateTime } from "../api";
import { Answer, Notification } from "./notification";
import { AppLogger } from "../logger";
import { LianeEvent } from "../event";
import { AppStorage } from "../storage";
import { HttpClient } from "./http";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { BehaviorSubject, Observable, Subject, SubscriptionLike } from "rxjs";
import { NetworkUnavailable, UnauthorizedError } from "../exception";

export type HubState = "online" | "reconnecting" | "offline";

export interface HubService {
  list(id: Ref<ConversationGroup>, params: PaginatedRequestParams): Promise<PaginatedResponse<ChatMessage>>;

  send(message: ChatMessage): Promise<void>;

  stop(): Promise<void>;

  start(): Promise<void>;

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

  subscribeToTrackingInfo(lianeId: string, callback: OnLocationCallback): Promise<{ closed: boolean; unsubscribe: () => Promise<void> }>;

  readNotifications(ids?: Ref<Notification>[]): Promise<void>;

  unreadConversations: Observable<Ref<ConversationGroup>[]>;
  unreadNotifications: Observable<Ref<Notification>[]>;
  lianeUpdates: Observable<Liane>;
  userUpdates: Observable<FullUser>;
  hubState: Observable<HubState>;
}

export type ConsumeMessage = (res: ChatMessage) => void;

export type Disconnect = () => Promise<void>;
export type OnLatestMessagesCallback = (res: PaginatedResponse<ChatMessage>) => void;
export type OnNotificationCallback = (n: Notification) => void;
export type OnLocationCallback = (l: TrackingInfo) => void;

type UnreadOverview = Readonly<{
  notifications: Ref<Notification>[];
  conversations: Ref<ConversationGroup>[];
}>;

export abstract class AbstractHubService implements HubService {
  protected currentConversationId?: string = undefined;
  readonly unreadConversations: BehaviorSubject<Ref<ConversationGroup>[]> = new BehaviorSubject<Ref<ConversationGroup>[]>([]);
  protected readonly notificationSubject: Subject<Notification> = new Subject<Notification>();
  lianeUpdates = new Subject<Liane>();
  userUpdates = new Subject<FullUser>();
  unreadNotifications = new BehaviorSubject<Ref<Notification>[]>([]);
  hubState = new Subject<HubState>();
  protected onReceiveLatestMessagesCallback: OnLatestMessagesCallback | null = null;
  // Sets a callback to receive messages after joining a conversation.
  // This callback will be automatically disposed of when closing conversation.
  protected onReceiveMessageCallback: ConsumeMessage | null = null;
  protected onReceiveLocationUpdateCallback: OnLocationCallback | undefined;
  protected appStateActive: boolean = true;

  protected constructor(
    protected readonly baseUrl: string,
    protected readonly logger: AppLogger
  ) {}

  protected receiveMessage = async (convId: string, message: ChatMessage) => {
    // Called when receiving a message inside current conversation
    this.logger.info("HUB", "received : msg", this.appStateActive, convId, message, this.currentConversationId);
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
    this.logger.info("HUB", "unread", unread);
    this.unreadConversations.next(unread.conversations);
    this.unreadNotifications.next(unread.notifications);
  };

  protected receiveNotification = async (notification: Notification) => {
    // Called on new notification
    this.logger.debug("HUB", "received :", this.appStateActive, notification);

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

  abstract start(): Promise<void>;

  abstract stop(): Promise<void>;

  abstract readNotifications(ids?: Ref<Notification>[]): Promise<void>;

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
    this.logger.info("HUB", "joined " + conv.id);
    this.currentConversationId = conv.id;
    // Remove from unread conversations
    if (this.unreadConversations.getValue().includes(conversationRef)) {
      this.unreadConversations.next(this.unreadConversations.getValue().filter(c => c !== conversationRef));
    }

    return conv;
  };

  async disconnectFromChat(_: Ref<ConversationGroup>): Promise<void> {
    if (this.currentConversationId) {
      this.onReceiveLatestMessagesCallback = null;
      this.onReceiveMessageCallback = null;
      this.logger.info("HUB", "left " + this.currentConversationId);
      this.currentConversationId = undefined;
    } else {
      this.logger.debug("HUB", "Tried to leave an undefined conversation.");
    }
  }

  async send(message: ChatMessage): Promise<void> {
    if (this.currentConversationId) {
      try {
        await this.sendToGroup(message);
      } catch (e) {
        this.logger.warn("HUB", `Could not send message to group ${this.currentConversationId}`, e);
      }
    } else {
      throw new Error("Could not send message to undefined conversation");
    }
  }

  protected receiveLocationUpdateCallback: OnLocationCallback = l => {
    this.logger.debug("GEOLOC", "received", l);

    if (this.onReceiveLocationUpdateCallback) {
      this.onReceiveLocationUpdateCallback(l);
    }
  };

  protected receiveLianeUpdate = (liane: Liane) => {
    this.lianeUpdates.next(liane);
  };

  protected receiveUserUpdate = (user: FullUser) => {
    this.userUpdates.next(user);
  };

  abstract readConversation(conversation: Ref<ConversationGroup>, timestamp: UTCDateTime): Promise<void>;

  abstract sendToGroup(message: ChatMessage): Promise<void>;

  abstract joinGroupChat(conversationId: Ref<ConversationGroup>): Promise<ConversationGroup>;

  abstract postEvent(lianeEvent: LianeEvent): Promise<void>;

  abstract postAnswer(notificationId: string, answer: Answer): Promise<void>;

  abstract subscribeToTrackingInfo(lianeId: string, callback: OnLocationCallback): Promise<{ closed: boolean; unsubscribe: () => Promise<void> }>;
}

export class HubServiceClient extends AbstractHubService {
  private hub: HubConnection;

  private isStarted = false;
  constructor(
    baseUrl: string,
    logger: AppLogger,
    protected readonly storage: AppStorage,
    protected readonly http: HttpClient
  ) {
    super(baseUrl, logger);
    this.hub = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hub`, {
        accessTokenFactory: async () => {
          const token = await this.http.getUpdatedAccessToken();
          if (!token) {
            this.logger.warn("HUB", "Bizarre bizarre token is empty", token);
          }
          return token!;
        }
      })
      .configureLogging(LogLevel.Debug)
      .withAutomaticReconnect()
      .build();

    this.hub.onreconnecting(() => {
      this.hubState.next("reconnecting");
    });
    this.hub.onreconnected(() => this.hubState.next("online"));
    this.hub.on("ReceiveLatestMessages", this.receiveLatestMessages);
    this.hub.on("ReceiveMessage", this.receiveMessage);
    this.hub.on("Me", async (next: FullUser) => {
      await this.storage.storeUser(next);
      this.receiveUserUpdate(next);
    });
    this.hub.on("ReceiveUnreadOverview", this.receiveUnreadOverview);
    this.hub.on("ReceiveNotification", this.receiveNotification);
    this.hub.on("ReceiveTrackingInfo", this.receiveLocationUpdateCallback);
    this.hub.on("ReceiveLianeUpdate", this.receiveLianeUpdate);
    this.hub.onclose(err => {
      this.isStarted = false;
      this.hubState.next("offline");
      if (err) {
        this.logger.debug("HUB", "Connection closed with error : ", err);
      }
    });
  }

  async start() {
    if (this.isStarted) {
      this.logger.info("HUB", "Already started");
      return;
    }
    this.logger.info("HUB", "start");

    // we do not wait to connect to the hub to start the app
    this.startAndRetry()
      .then(() => {
        this.isStarted = true;
        this.hubState.next("online");
      })
      .catch(err => {
        this.isStarted = false;
        this.hubState.next("offline");
        if (err) {
          this.logger.debug("HUB", "Unable to start the hub, stay offline", err);
        }
      });
  }

  async stop() {
    this.logger.debug("HUB", "stop");
    await this.hub.stop().catch(err => console.warn(err));
    this.isStarted = false;
  }

  async list(id: Ref<ConversationGroup>, params: PaginatedRequestParams) {
    return this.http.get<PaginatedResponse<ChatMessage>>(`/conversation/${id}/message`, { params });
  }

  async readNotifications(ids?: Ref<Notification>[]) {
    await this.hub.invoke("ReadNotifications", ids ?? this.unreadNotifications.getValue());
    this.unreadNotifications.next([]);
  }

  async readConversation(conversation: Ref<ConversationGroup>, timestamp: UTCDateTime) {
    await this.hub.invoke("ReadConversation", conversation, timestamp);
  }

  async joinGroupChat(conversationId: Ref<ConversationGroup>) {
    return this.hub.invoke<ConversationGroup>("JoinGroupChat", conversationId);
  }

  async sendToGroup(message: ChatMessage) {
    await this.hub.invoke("SendToGroup", message, this.currentConversationId);
  }

  async postEvent(lianeEvent: LianeEvent) {
    await this.hub.invoke("PostEvent", lianeEvent);
  }

  async postAnswer(notificationId: string, answer: Answer) {
    await this.hub.invoke("PostAnswer", notificationId, answer);
  }

  async subscribeToTrackingInfo(lianeId: string, callback: OnLocationCallback): Promise<{ closed: boolean; unsubscribe: () => Promise<void> }> {
    const lastUpdate: TrackingInfo = await this.hub.invoke("GetLastTrackingInfo", lianeId);

    callback(lastUpdate);

    this.onReceiveLocationUpdateCallback = callback;
    return {
      closed: this.onReceiveLocationUpdateCallback !== callback,
      unsubscribe: async () => {
        this.onReceiveLatestMessagesCallback = null;
      }
    };
  }

  private async startAndRetry() {
    if (this.hub.state === "Connected") {
      return;
    }
    return this.hub.start().catch(err => {
      if (err.message.includes("Network request failed")) {
        throw new NetworkUnavailable();
      } else if (err.message.includes("Status code '401'")) {
        throw new UnauthorizedError();
      } else {
        throw err;
      }
    });
  }
}
