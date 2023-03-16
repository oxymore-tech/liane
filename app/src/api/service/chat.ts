import { ChatMessage, ConversationGroup, FullUser, PaginatedRequestParams, PaginatedResponse, Ref } from "@/api";
import { BaseUrl, get, tryRefreshToken } from "@/api/http";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getAccessToken, getCurrentUser, getRefreshToken, storeCurrentUser } from "@/api/storage";
import { NetworkUnavailable } from "@/api/exception";
import { AbstractHubService } from "@/api/service/interfaces/hub";

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
      this.hub.on("ReceiveLatestMessages", this.receiveLatestMessages);
      this.hub.on("ReceiveMessage", this.receiveMessage);
      this.hub.on("Me", async (me: FullUser) => {
        // Called when hub is started
        console.log("me", me);
        this.isStarted = true;
        await storeCurrentUser(me);
        resolve(me);
      });
      this.hub.on("ReceiveUnreadOverview", this.receiveUnreadOverview);
      this.hub.on("ReceiveNotification", this.receiveNotification);
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

  async leaveGroupChat(): Promise<void> {
    await this.checkConnection();
    await this.hub.invoke("LeaveGroupChat", this.currentConversationId);
  }
  async joinGroupChat(conversationId: Ref<ConversationGroup>): Promise<ConversationGroup> {
    await this.checkConnection();
    return this.hub.invoke("JoinGroupChat", conversationId);
  }
  async sendToGroup(message: ChatMessage): Promise<void> {
    await this.checkConnection();
    await this.hub.invoke("SendToGroup", message, this.currentConversationId);
  }

  private checkConnection = async () => {
    if (this.hub.state !== "Connected") {
      console.debug("Tried to join chat but state was ", this.hub.state);
      await this.hub.stop();
      await this.hub.start();
    }
  };
}
