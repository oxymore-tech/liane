import { FullUser, Liane, PaginatedResponse, Ref, TrackingInfo } from "../api";
import { AppLogger } from "../logger";
import { AppStorage } from "../storage";
import { HttpClient } from "./http";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { NetworkUnavailable, UnauthorizedError } from "../exception";
import { CoLiane, LianeMessage } from "./community";
import { AbstractChat, Chat, ChatType, GroupTypeOf, MessageTypeOf } from "./chat";

export type HubState = "online" | "reconnecting" | "offline";

export interface HubService {
  stop(): Promise<void>;

  start(): Promise<void>;

  connectToLianeChat(
    conversation: Ref<CoLiane>,
    onReceiveLatestMessages: OnLatestMessagesCallback<LianeMessage>,
    onReceiveMessage: ConsumeMessage<LianeMessage>
  ): Promise<Chat<"Liane">>;

  disconnectFromChat(): Promise<void>;

  updateActiveState(active: boolean): void;

  subscribeToTrackingInfo(lianeId: string, callback: OnLocationCallback): Promise<{ closed: boolean; unsubscribe: () => Promise<void> }>;

  unreadNotifications: Observable<Record<Ref<CoLiane>, number>>;
  tripUpdates: Observable<Liane>;
  lianeUpdates: Observable<CoLiane>;
  userUpdates: Observable<FullUser>;
  hubState: Observable<HubState>;
}

export type ConsumeMessage<TMessage> = (res: TMessage) => void;

export type OnLatestMessagesCallback<TMessage> = (res: PaginatedResponse<TMessage>) => void;
export type OnLocationCallback = (l: TrackingInfo) => void;

type UnreadOverview = Record<Ref<CoLiane>, number>;

export abstract class AbstractHubService implements HubService {
  tripUpdates = new Subject<Liane>();
  lianeUpdates = new Subject<CoLiane>();
  userUpdates = new Subject<FullUser>();
  unreadNotifications = new BehaviorSubject<Record<Ref<CoLiane>, number>>({});
  hubState = new Subject<HubState>();
  protected currentChat?: AbstractChat;
  protected onReceiveLocationUpdateCallback: OnLocationCallback | undefined;
  protected appStateActive: boolean = true;

  protected constructor(
    protected readonly baseUrl: string,
    protected readonly logger: AppLogger
  ) {}

  abstract start(): Promise<void>;

  abstract stop(): Promise<void>;

  updateActiveState(active: boolean) {
    this.appStateActive = active;
  }

  connectToLianeChat(
    conversationRef: Ref<CoLiane>,
    onReceiveLatestMessages: OnLatestMessagesCallback<LianeMessage>,
    onReceiveMessage: ConsumeMessage<LianeMessage>
  ) {
    return this.connectToChat("Liane", conversationRef, onReceiveLatestMessages, onReceiveMessage);
  }

  async disconnectFromChat() {
    if (this.currentChat) {
      await this.currentChat.disconnect();
    }
    this.currentChat = undefined;
  }

  protected receiveLocationUpdateCallback: OnLocationCallback = l => {
    this.logger.debug("GEOLOC", "received", l);

    if (this.onReceiveLocationUpdateCallback) {
      this.onReceiveLocationUpdateCallback(l);
    }
  };

  protected receiveTripUpdate = (trip: Liane) => {
    this.tripUpdates.next(trip);
  };

  protected receiveLianeUpdate = (liane: CoLiane) => {
    this.lianeUpdates.next(liane);
  };

  protected receiveUserUpdate = (user: FullUser) => {
    this.userUpdates.next(user);
  };

  protected abstract connectToChat<TChatType extends ChatType>(
    name: TChatType,
    conversationRef: Ref<GroupTypeOf<TChatType>>,
    onReceiveLatestMessages: OnLatestMessagesCallback<MessageTypeOf<TChatType>>,
    onReceiveMessage: ConsumeMessage<MessageTypeOf<TChatType>>
  ): Promise<Chat<TChatType>>;

  abstract subscribeToTrackingInfo(lianeId: string, callback: OnLocationCallback): Promise<{ closed: boolean; unsubscribe: () => Promise<void> }>;
}

export class HubServiceClient extends AbstractHubService {
  private readonly hub: HubConnection;

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
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: _ => {
          return 5000;
        }
      })
      .build();

    this.logger.debug("HUB", `keepAliveIntervalInMilliseconds = ${this.hub.keepAliveIntervalInMilliseconds}ms`);
    this.logger.debug("HUB", `serverTimeoutInMilliseconds = ${this.hub.serverTimeoutInMilliseconds}ms`);

    this.hub.onreconnecting(() => {
      this.logger.debug("HUB", "Reconnecting");
      this.hubState.next("reconnecting");
    });
    this.hub.onreconnected(() => {
      this.logger.debug("HUB", "Reconnected");
      this.hubState.next("online");
    });

    this.hub.on("ReceiveLatestLianeMessages", async (m: PaginatedResponse<LianeMessage>) => this.receiveLatestMessages("Liane", m));
    this.hub.on("ReceiveLianeMessage", async (c: string, m: LianeMessage) => this.receiveMessage("Liane", c, m));

    this.hub.on("ReceiveUnreadOverview", this.receiveUnreadOverview);
    this.hub.on("Me", async (next: FullUser) => {
      await this.storage.storeUser(next);
      this.receiveUserUpdate(next);
    });
    this.hub.on("ReceiveTrackingInfo", this.receiveLocationUpdateCallback);
    this.hub.on("ReceiveLianeUpdate", this.receiveLianeUpdate);
    this.hub.on("ReceiveTripUpdate", this.receiveTripUpdate);
    this.hub.onclose(err => {
      this.isStarted = false;
      this.hubState.next("offline");
      if (err) {
        this.logger.debug("HUB", "Connection closed with error : ", err);
      } else {
        this.logger.debug("HUB", "Connection closed without error");
      }
    });
  }

  private async receiveLatestMessages<TChatType extends ChatType>(chatType: TChatType, m: PaginatedResponse<MessageTypeOf<TChatType>>) {
    if (!this.currentChat) {
      return;
    }
    if (this.currentChat.name === chatType) {
      await this.currentChat.receiveLatestMessages(m as any);
    }
  }

  private receiveMessage<TChatType extends ChatType>(chatType: TChatType, conversationId: string, message: MessageTypeOf<TChatType>) {
    if (!this.currentChat) {
      return false;
    }
    if (this.currentChat.name === chatType) {
      return this.currentChat?.receiveMessage(conversationId, message as any);
    }
    return false;
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
    await this.hub.stop().catch(err => this.logger.warn("HUB", err));
    this.isStarted = false;
  }

  async subscribeToTrackingInfo(lianeId: string, callback: OnLocationCallback): Promise<{ closed: boolean; unsubscribe: () => Promise<void> }> {
    const lastUpdate: TrackingInfo = await this.hub.invoke("GetLastTrackingInfo", lianeId);

    callback(lastUpdate);

    this.onReceiveLocationUpdateCallback = callback;
    return {
      closed: this.onReceiveLocationUpdateCallback !== callback,
      unsubscribe: async () => {
        this.onReceiveLocationUpdateCallback = undefined;
      }
    };
  }

  protected async connectToChat<TChatType extends ChatType>(
    name: TChatType,
    conversationRef: Ref<GroupTypeOf<TChatType>>,
    onReceiveLatestMessages: OnLatestMessagesCallback<MessageTypeOf<TChatType>>,
    onReceiveMessage: ConsumeMessage<MessageTypeOf<TChatType>>
  ): Promise<Chat<TChatType>> {
    await this.start();
    if (this.currentChat) {
      await this.currentChat.disconnect();
    }
    const currentChat = new Chat<TChatType>(this.hub, name, this.logger);
    await currentChat.connect(conversationRef, onReceiveLatestMessages, onReceiveMessage);
    this.currentChat = currentChat as AbstractChat;

    return currentChat;
  }

  protected receiveUnreadOverview = async (unread: UnreadOverview) => {
    // Called when hub is started
    this.logger.info("HUB", "unread", unread);
    this.unreadNotifications.next(unread);
  };

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
