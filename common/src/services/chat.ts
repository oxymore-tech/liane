import { ConsumeMessage, OnLatestMessagesCallback } from "./hub";
import { HubConnection } from "@microsoft/signalr";
import { ChatMessage, ConversationGroup, PaginatedResponse, Ref, UTCDateTime } from "../api";
import { AppLogger } from "../logger";
import { CoLiane, LianeMessage, MessageContent } from "./community";

export type ChatType = "Group" | "Liane";

export type AbstractChat = Chat<"Group"> | Chat<"Liane">;

export type GroupTypeOf<TChat extends ChatType> = TChat extends "Group" ? ConversationGroup : CoLiane;
export type MessageContentTypeOf<TChat extends ChatType> = TChat extends "Group" ? ChatMessage : MessageContent;
export type MessageTypeOf<TChat extends ChatType> = TChat extends "Group" ? ChatMessage : LianeMessage;

export class Chat<TChatType extends ChatType> {
  constructor(
    private hub: HubConnection,
    public name: TChatType,
    private logger: AppLogger
  ) {}

  currentGroup?: GroupTypeOf<TChatType>;

  protected onReceiveLatestMessagesCallback: OnLatestMessagesCallback<MessageTypeOf<TChatType>> | null = null;
  // Sets a callback to receive messages after joining a conversation.
  // This callback will be automatically disposed of when closing conversation.
  protected onReceiveMessageCallback: ConsumeMessage<MessageTypeOf<TChatType>> | null = null;

  async connect(
    conversationRef: Ref<GroupTypeOf<TChatType>>,
    onReceiveLatestMessages: OnLatestMessagesCallback<MessageTypeOf<TChatType>>,
    onReceiveMessage: ConsumeMessage<MessageTypeOf<TChatType>>
  ) {
    this.onReceiveLatestMessagesCallback = onReceiveLatestMessages;
    this.onReceiveMessageCallback = onReceiveMessage;
    this.currentGroup = await this.joinGroupChat(conversationRef);
    this.logger.info("CHAT", "joined " + this.currentGroup.id);
  }

  async disconnect() {
    if (!this.currentGroup) {
      this.logger.info("CHAT", "Tried to leave an undefined conversation.");
      return;
    }
    this.onReceiveLatestMessagesCallback = null;
    this.onReceiveMessageCallback = null;
    this.logger.info("CHAT", "left " + this.currentGroup.id);
    this.currentGroup = undefined;
  }

  async send(message: MessageContentTypeOf<TChatType>): Promise<void> {
    if (!this.currentGroup) {
      throw new Error("Could not send message to undefined conversation");
    }
    try {
      await this.hub.invoke(`SendTo${this.name}`, message, this.currentGroup.id);
    } catch (e) {
      this.logger.warn("CHAT", `Could not send message to group ${this.currentGroup}`, e);
    }
  }

  async readConversation(conversation: Ref<GroupTypeOf<TChatType>>, timestamp: UTCDateTime) {
    await this.hub.invoke(`Read${this.name}`, conversation, timestamp);
  }

  async joinGroupChat(conversationId: Ref<GroupTypeOf<TChatType>>) {
    return this.hub.invoke<GroupTypeOf<TChatType>>(`Join${this.name}Chat`, conversationId);
  }

  async receiveMessage(convId: string, message: MessageTypeOf<TChatType>) {
    // Called when receiving a message inside current conversation
    this.logger.info("CHAT", "received : msg", convId, message, this.currentGroup?.id);

    if (this.currentGroup?.id === convId && this.onReceiveMessageCallback) {
      console.log("onReceiveMessageCallback", message);
      this.onReceiveMessageCallback(message);
      return true;
    }

    return false;
  }

  async receiveLatestMessages(messages: PaginatedResponse<MessageTypeOf<TChatType>>) {
    // Called after joining a conversation
    if (this.onReceiveLatestMessagesCallback) {
      this.onReceiveLatestMessagesCallback(messages);
    }
  }
}
