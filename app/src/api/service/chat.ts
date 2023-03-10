import { ChatMessage, ConversationGroup, FullUser, PaginatedRequestParams, PaginatedResponse, Ref } from "@/api";
import { BaseUrl, get, tryRefreshToken } from "@/api/http";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getAccessToken, getCurrentUser, getRefreshToken, storeCurrentUser } from "@/api/storage";
import { BehaviorSubject, Observable, Subject, SubscriptionLike } from "rxjs";
import { NetworkUnavailable } from "@/api/exception";

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

function createChatConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${BaseUrl}/hub`, {
      accessTokenFactory: async () => {
        return (await getAccessToken())!;
      }
    })
    .configureLogging(LogLevel.Information)
    .withAutomaticReconnect()
    .build();
}
export class HubServiceClient implements ChatHubService {
  private hub: HubConnection;
  private currentConversationId?: string = undefined;
  readonly unreadConversations: BehaviorSubject<Ref<ConversationGroup>[]> = new BehaviorSubject<Ref<ConversationGroup>[]>([]);
  // readonly unreadNotificationCount: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private notificationSubject: Subject<Notification> = new Subject<Notification>();
  // Sets a callback to receive the lat est messages when joining the conversation.
  // This callback will be automatically disposed of when closing conversation.
  private onReceiveLatestMessagesCallback: OnLatestMessagesCallback | null = null;
  // Sets a callback to receive messages after joining a conversation.
  // This callback will be automatically disposed of when closing conversation.
  private onReceiveMessageCallback: ConsumeMessage | null = null;

  unreadNotificationCount = new BehaviorSubject<number>(0);

  private isStarted = false;
  constructor() {
    this.hub = createChatConnection();
  }

  start = () => {
    if (this.isStarted) {
      console.debug("hub already started");
      return new Promise<FullUser>(async (resolve, reject) => {
        const found = await getCurrentUser();
        if (found) {
          resolve(found);
        } else {
          reject(new Error("current user not found"));
        }
      });
    }
    console.debug("start");
    return new Promise<FullUser>((resolve, reject) => {
      let alreadyClosed = false;
      this.hub.on("ReceiveLatestMessages", async messages => {
        // Called after joining a conversation
        if (this.onReceiveLatestMessagesCallback) {
          await this.onReceiveLatestMessagesCallback(messages);
        }
      });
      this.hub.on("ReceiveMessage", async (convId, message) => {
        // Called when receiving a message inside current conversation
        console.debug("received msg", convId, message, this.currentConversationId);
        if (this.currentConversationId === convId && this.onReceiveMessageCallback) {
          await this.onReceiveMessageCallback(message);
        } else if (!this.unreadConversations.getValue().includes(convId)) {
          this.unreadConversations.next([...this.unreadConversations.getValue(), convId]);
        }
      });
      this.hub.on("Me", async (me: FullUser) => {
        // Called when hub is started
        console.log("me", me);
        this.isStarted = true;
        await storeCurrentUser(me);
        resolve(me);
      });
      this.hub.on("ReceiveUnreadOverview", async (unread: UnreadOverview) => {
        // Called when hub is started
        console.log("unread", unread);
        this.unreadConversations.next(unread.conversations);
        this.unreadNotificationCount.next(unread.notificationsCount);
      });
      this.hub.on("ReceiveNotification", async (notification: Notification) => {
        // Called on new notification
        if (__DEV__) {
          console.log("received:", notification);
        }
        this.notificationSubject.next(notification);
      });
      this.hub.onclose(err => {
        if (!alreadyClosed) {
          if (__DEV__) {
            console.log("Connection closed with error during initialization: ", err);
          }
          alreadyClosed = true;
          reject(err);
        }
      });
      this.hub.start().catch(async (err: Error) => {
        console.debug("Hub [start] error :", err, this.hub.state);
        // Only reject if error happens before connection is established
        if (this.hub.state !== "Connected") {
          // Retry if err 401
          if (err.message.includes("Status code '401'") && (await getRefreshToken())) {
            try {
              await tryRefreshToken<void>(async () => {
                await this.hub.start().catch(e => reject(e));
              });
            } catch (e) {
              reject(e);
            }
          } else if (err.message.includes("Network request failed")) {
            // Network or server unavailable
            reject(new NetworkUnavailable());
          } else {
            reject(err);
          }
        }
      });
    });
  };

  stop = () => {
    console.log("stop");
    // TODO close all observables
    return this.hub.stop();
  };
  list = async (id: Ref<ConversationGroup>, params: PaginatedRequestParams): Promise<PaginatedResponse<ChatMessage>> =>
    get(`/conversation/${id}/message`, { params });
  async connectToChat(
    conversationRef: Ref<ConversationGroup>,
    onReceiveLatestMessages: OnLatestMessagesCallback,
    onReceiveMessage: ConsumeMessage
  ): Promise<ConversationGroup> {
    if (this.currentConversationId) {
      await this.disconnectFromChat(this.currentConversationId);
    }
    this.onReceiveLatestMessagesCallback = onReceiveLatestMessages;
    this.onReceiveMessageCallback = onReceiveMessage;
    const conv: ConversationGroup = await this.hub.invoke("JoinGroupChat", conversationRef);
    console.log("joined " + conv.id);
    this.currentConversationId = conv.id;
    // Remove from unread conversations
    if (this.unreadConversations.getValue().includes(conversationRef)) {
      this.unreadConversations.next(this.unreadConversations.getValue().filter(c => c !== conversationRef));
    }

    return conv;
  }
  async disconnectFromChat(_: Ref<ConversationGroup>): Promise<void> {
    if (this.currentConversationId) {
      this.onReceiveLatestMessagesCallback = null;
      this.onReceiveMessageCallback = null;
      await this.hub.invoke("LeaveGroupChat", this.currentConversationId);
      console.log("left " + this.currentConversationId);
      this.currentConversationId = undefined;
    } else if (__DEV__) {
      console.log("Tried to leave an undefined conversation.");
    }
  }
  async send(message: ChatMessage): Promise<void> {
    console.log("send");
    if (this.currentConversationId) {
      try {
        await this.hub.invoke("SendToGroup", message, this.currentConversationId);
      } catch (e) {
        if (__DEV__) {
          console.log(`Could not send message : ${JSON.stringify(message)}`, e);
        }
      }
    } else {
      throw new Error("Could not send message to undefined conversation");
    }
  }
  subscribeToNotifications(callback: OnNotificationCallback) {
    return this.notificationSubject.subscribe(callback);
  }
}
