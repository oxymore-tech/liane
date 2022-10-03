import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { IChatMessage, User as SignarlrUser } from "react-native-gifted-chat/lib/Models";
import { BaseUrl } from "@/api/http";
import { getStoredToken } from "@/api/storage";
import { ChatMessage, Ref, User } from "@/api/index";

export function getChatConnection() : HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${BaseUrl}/hub`, {
      accessTokenFactory: async () => (await getStoredToken())!
    })
    .configureLogging(LogLevel.Information)
    .build();
}

export type TypedSignalrMessage = Readonly<{
  messageType: "proposal";
} & IChatMessage>;

function toSignalrUser(user: Ref<User>) : SignarlrUser {
  const resolved = user as User;
  return { _id: resolved.id!, name: resolved.phone };
}

export function toSignalrChatMessage(chatMessage: ChatMessage) : IChatMessage {
  return { _id: chatMessage.id!, user: toSignalrUser(chatMessage.createdBy!), text: chatMessage.text, createdAt: chatMessage.createdAt! };
}