import { ConsumeMessage } from "./hub";
import { AppLogger } from "../logger";
import { LianeMessage } from "./community";

export type ChatType = "Liane";

export type AbstractChat = Chat<"Liane">;

export type MessageTypeOf<TChat extends ChatType> = TChat extends "Liane" ? LianeMessage : never;

export class Chat<TChatType extends ChatType> {
  constructor(
    public name: TChatType,
    private logger: AppLogger
  ) {}

  // Sets a callback to receive messages after joining a conversation.
  // This callback will be automatically disposed of when closing conversation.
  protected onReceiveMessageCallback: ConsumeMessage<MessageTypeOf<TChatType>> | null = null;

  async connect(onReceiveMessage: ConsumeMessage<MessageTypeOf<TChatType>>) {
    this.onReceiveMessageCallback = onReceiveMessage;
    this.logger.info("CHAT", "joined chat");
  }

  async disconnect() {
    this.onReceiveMessageCallback = null;
    this.logger.info("CHAT", "left");
  }

  async receiveMessage(convId: string, message: MessageTypeOf<TChatType>) {
    this.logger.info("CHAT", "received : msg");
    if (!this.onReceiveMessageCallback) {
      return false;
    }
    this.onReceiveMessageCallback(convId, message);
    return true;
  }
}
