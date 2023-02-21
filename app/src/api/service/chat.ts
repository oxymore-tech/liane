import { ChatMessage, ConversationGroup, DatetimeCursor, PaginatedRequestParams, PaginatedResponse, Ref, User } from "@/api";
import { BaseUrl, get, tryRefreshToken } from "@/api/http";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getAccessToken, getRefreshToken } from "@/api/storage";

export interface ChatHubService {
  list(id: Ref<ConversationGroup>, params: PaginatedRequestParams<DatetimeCursor>): Promise<PaginatedResponse<ChatMessage>>;
  send(message: ChatMessage): Promise<void>;
  stop(): Promise<void>;
  start(): Promise<User>;
  connectToChat(
    conversation: Ref<ConversationGroup>,
    onReceiveLatestMessages: OnLatestMessagesCallback,
    onReceiveMessage: OnMessageCallback
  ): Promise<ConversationGroup>;
}

export type OnMessageCallback = (res: ChatMessage) => void;
export type OnLatestMessagesCallback = (res: PaginatedResponse<ChatMessage>) => void;

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

  // Sets a callback to receive latests messages when joining the conversation.
  // This callback will be automatically disposed of when closing conversation.
  private onReceiveLatestMessagesCallback: OnLatestMessagesCallback | null = null;
  // Sets a callback to receive messages after joining a conversation.
  // This callback will be automatically disposed of when closing conversation.

  private onReceiveMessageCallback: OnMessageCallback | null = null;
  constructor() {
    this.hub = createChatConnection();
  }

  start = () => {
    console.log("start");
    return new Promise<User>((resolve, reject) => {
      let successfullyStarted = false;
      this.hub.on("ReceiveLatestMessages", async messages => {
        if (this.onReceiveLatestMessagesCallback) {
          await this.onReceiveLatestMessagesCallback(messages);
        }
      });
      this.hub.on("ReceiveMessage", async message => {
        if (this.onReceiveMessageCallback) {
          await this.onReceiveMessageCallback(message);
        }
      });
      this.hub.on("Me", async (me: User) => {
        console.log("me", me); // TODO find out why sent twice on startup
        resolve(me);
      });
      this.hub.onclose(err => {
        if (!successfullyStarted) {
          if (__DEV__) {
            console.log("Connection closed with error during initialization: ", err);
          }
          successfullyStarted = true;
          reject(err);
        }
      });
      this.hub.start().catch(async (err: Error) => {
        // Retry if err 401

        if (err.message.includes("Status code '401'") && (await getRefreshToken())) {
          try {
            await tryRefreshToken<void>(async () => {
              await this.hub.start().catch(e => reject(e));
            });
          } catch (e) {
            reject(e);
          }
        }
        reject(err);
      });
    });
  };

  stop = () => {
    console.log("stop");
    return this.hub.stop();
  };
  list = async (id: Ref<ConversationGroup>, params: PaginatedRequestParams<DatetimeCursor>): Promise<PaginatedResponse<ChatMessage>> =>
    get(`/conversation/${id}/message`, { params });
  async connectToChat(
    conversationRef: Ref<ConversationGroup>,
    onReceiveLatestMessages: OnLatestMessagesCallback,
    onReceiveMessage: OnMessageCallback
  ): Promise<ConversationGroup> {
    if (this.currentConversationId) {
      await this.disconnectFromConversation();
    }
    this.onReceiveLatestMessagesCallback = onReceiveLatestMessages;
    this.onReceiveMessageCallback = onReceiveMessage;
    const conv: ConversationGroup = await this.hub.invoke("JoinGroupChat", conversationRef);
    console.log("joined " + conv.id);
    this.currentConversationId = conv.id;

    return conv;
  }
  async disconnectFromConversation(): Promise<void> {
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
}
