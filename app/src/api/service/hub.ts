import { ChatMessage, ConversationGroup, FullUser, PaginatedRequestParams, PaginatedResponse, Ref, TrackedMemberLocation, UTCDateTime } from "@/api";
import { BaseUrl, get, tryRefreshToken } from "@/api/http";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getAccessToken, getCurrentUser, getRefreshToken, storeCurrentUser } from "@/api/storage";
import { NetworkUnavailable } from "@/api/exception";
import { AbstractHubService, OnLocationCallback } from "@/api/service/interfaces/hub";
import { LianeEvent } from "@/api/event";
import { Answer } from "@/api/notification";
import { SubscriptionLike } from "rxjs";
import { AppLogger } from "@/api/logger";

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

export class HubServiceClient extends AbstractHubService {
  private hub: HubConnection;

  private isStarted = false;
  constructor() {
    super();
    this.hub = createChatConnection();
  }

  start = () => {
    if (this.isStarted) {
      AppLogger.info("HUB", "Already started");
      return new Promise<FullUser>(async (resolve, reject) => {
        const found = await getCurrentUser();
        if (found) {
          resolve(found);
        } else {
          reject(new Error("current user not found"));
        }
      });
    }
    AppLogger.info("HUB", "start");
    return new Promise<FullUser>((resolve, reject) => {
      this.hub.onreconnecting(() => {
        this.hubState.next("reconnecting");
      });
      this.hub.onreconnected(() => this.hubState.next("online"));
      this.hub.on("ReceiveLatestMessages", this.receiveLatestMessages);
      this.hub.on("ReceiveMessage", this.receiveMessage);
      this.hub.on("Me", async (me: FullUser) => {
        // Called when hub is started
        AppLogger.info("HUB", "me", me);
        this.isStarted = true;
        await storeCurrentUser(me);
        resolve(me);
      });
      this.hub.on("ReceiveUnreadOverview", this.receiveUnreadOverview);
      this.hub.on("ReceiveNotification", this.receiveNotification);
      this.hub.on("ReceiveLianeMemberLocationUpdate", this.receiveLocationUpdateCallback);
      this.hub.on("ReceiveLianeUpdate", this.receiveLianeUpdate);
      this.hub.onclose(err => {
        if (__DEV__ && err) {
          AppLogger.debug("HUB", "Connection closed with error : ", err);
        }
        this.isStarted = false;
        this.hubState.next("offline");
      });
      this.hub
        .start()
        .then(() => {
          this.hubState.next("online");
        })
        .catch(async (err: Error) => {
          AppLogger.info("HUB", "could not start :", err, this.hub.state);
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

  stop = async () => {
    AppLogger.debug("HUB", "stop");
    await this.hub.stop();
    this.isStarted = false;
  };

  async list(id: Ref<ConversationGroup>, params: PaginatedRequestParams) {
    return get<PaginatedResponse<ChatMessage>>(`/conversation/${id}/message`, { params });
  }

  async readConversation(conversation: Ref<ConversationGroup>, timestamp: UTCDateTime) {
    await this.checkConnection();
    await this.hub.invoke("ReadConversation", conversation, timestamp);
  }
  async joinGroupChat(conversationId: Ref<ConversationGroup>) {
    await this.checkConnection();
    return this.hub.invoke<ConversationGroup>("JoinGroupChat", conversationId);
  }

  async sendToGroup(message: ChatMessage) {
    await this.checkConnection();
    await this.hub.invoke("SendToGroup", message, this.currentConversationId);
  }

  async postEvent(lianeEvent: LianeEvent) {
    await this.checkConnection();
    await this.hub.invoke("PostEvent", lianeEvent);
  }

  async postAnswer(notificationId: string, answer: Answer) {
    await this.checkConnection();
    await this.hub.invoke("PostAnswer", notificationId, answer);
  }

  private checkConnection = async () => {
    if (this.hub.state !== "Connected") {
      AppLogger.info("HUB", "Tried to join chat but state was ", this.hub.state);
      await this.hub.stop();
      await this.hub.start();
    }
  };
  async subscribeToPosition(lianeId: string, memberId: string, callback: OnLocationCallback): Promise<SubscriptionLike> {
    await this.checkConnection();
    if (this.onReceiveLocationUpdateCallback) {
      await this.hub.invoke("UnsubscribeFromLocationsUpdates", lianeId, memberId);
    }
    const lastUpdate: TrackedMemberLocation | null = await this.hub.invoke("SubscribeToLocationsUpdates", lianeId, memberId);
    if (lastUpdate) {
      callback(lastUpdate);
    }
    this.onReceiveLocationUpdateCallback = callback;
    return {
      closed: this.onReceiveLocationUpdateCallback !== callback,
      unsubscribe: () => {
        this.onReceiveLocationUpdateCallback = null;
        this.checkConnection().then(() => this.hub.invoke("UnsubscribeFromLocationsUpdates", lianeId, memberId));
      }
    };
  }
}
