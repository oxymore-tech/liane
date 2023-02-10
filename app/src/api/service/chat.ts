import { ChatMessage, ConversationGroup, DatetimeCursor, PaginatedRequestParams, PaginatedResponse, Ref, User } from "@/api";
import { get, tryRefreshToken } from "@/api/http";
import { HubConnection } from "@microsoft/signalr";
import { createChatConnection } from "@/api/chat";
import { UnauthorizedError } from "@/api/exception";

export interface ChatService {
  list(id: Ref<ConversationGroup>, params: PaginatedRequestParams<DatetimeCursor>): Promise<PaginatedResponse<ChatMessage, DatetimeCursor>>;
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
export type OnLatestMessagesCallback = (res: PaginatedResponse<ChatMessage, DatetimeCursor>) => void;

export class HubServiceClient implements ChatService {
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
        console.log("me", me);
        resolve(me);
      });
      this.hub.start().catch(async err => {
        // Retry if err 401
        if (err instanceof UnauthorizedError) {
          await tryRefreshToken<void>(async () => {
            this.hub.start().catch(e => reject(e));
          });
        }
        reject(err);
      });
    });
  };

  stop = () => {
    console.log("stop");
    return this.hub.stop();
  };
  list = async (
    id: Ref<ConversationGroup>,
    params: PaginatedRequestParams<DatetimeCursor>
  ): Promise<PaginatedResponse<ChatMessage, DatetimeCursor>> => get(`/conversation/${id}/message`, { params });
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
