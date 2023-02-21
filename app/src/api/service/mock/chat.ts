import { ChatHubService, OnLatestMessagesCallback, OnMessageCallback } from "@/api/service/chat";
import { ChatMessage, ConversationGroup, PaginatedRequestParams, PaginatedResponse, User, Ref } from "@/api";

export class HubServiceMock implements ChatHubService {
  connectToChat(
    conversation: Ref<ConversationGroup>,
    onReceiveLatestMessages: OnLatestMessagesCallback,
    onReceiveMessage: OnMessageCallback
  ): Promise<ConversationGroup> {
    throw new Error("Not implemented");
  }
  list(id: Ref<ConversationGroup>, params: PaginatedRequestParams): Promise<PaginatedResponse<ChatMessage>> {
    throw new Error("Not implemented");
  }
  send(message: ChatMessage): Promise<void> {
    throw new Error("Not implemented");
  }
  readonly mockUser: User = {
    id: "00000",
    phone: "0600000000",
    pseudo: "John Doe"
  };
  start(): Promise<User> {
    return Promise.resolve(this.mockUser);
  }
  stop(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
