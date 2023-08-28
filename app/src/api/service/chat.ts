import { ChatMessage, ConversationGroup, FullUser, PaginatedRequestParams, PaginatedResponse, Ref, TrackedMemberLocation, UTCDateTime } from "@/api";
import { BaseUrl, get, tryRefreshToken } from "@/api/http";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getAccessToken, getCurrentUser, getRefreshToken, storeCurrentUser } from "@/api/storage";
import { NetworkUnavailable } from "@/api/exception";
import { AbstractHubService, OnLocationCallback } from "@/api/service/interfaces/hub";
import { LianeEvent } from "@/api/event";
import { Answer } from "@/api/notification";
import { SubscriptionLike } from "rxjs";

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
      console.debug("[HUB] already started");
      return new Promise<FullUser>(async (resolve, reject) => {
        const found = await getCurrentUser();
        if (found) {
          resolve(found);
        } else {
          reject(new Error("current user not found"));
        }
      });
    }
    console.debug("[HUB] start");
    return new Promise<FullUser>((resolve, reject) => {
      let alreadyClosed = false;
      this.hub.on("ReceiveLatestMessages", this.receiveLatestMessages);
      this.hub.on("ReceiveMessage", this.receiveMessage);
      this.hub.on("Me", async (me: FullUser) => {
        // Called when hub is started
        console.log("[HUB] me", me);
        this.isStarted = true;
        await storeCurrentUser(me);
        resolve(me);
      });
      this.hub.on("ReceiveUnreadOverview", this.receiveUnreadOverview);
      this.hub.on("ReceiveNotification", this.receiveNotification);
      this.hub.on("ReceiveLianeMemberLocationUpdate", this.receiveLocationUpdateCallback);
      this.hub.onclose(err => {
        if (!alreadyClosed) {
          if (__DEV__ && err) {
            console.log("[HUB] Connection closed with error : ", err);
          }
          alreadyClosed = true;
          reject(err);
        }
      });
      this.hub.start().catch(async (err: Error) => {
        console.debug("[HUB] could not start :", err, this.hub.state);
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
    console.log("[HUB] stop");
    // TODO close all observables

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
    this.unreadNotificationCount.next(this.unreadNotificationCount.getValue() - 1);
  }

  private checkConnection = async () => {
    if (this.hub.state !== "Connected") {
      console.debug("[HUB] Tried to join chat but state was ", this.hub.state);
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
