import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { IChatMessage, User as ISignarlrUser } from "react-native-gifted-chat/lib/Models";
import { BaseUrl } from "@/api/http";
import { getStoredToken } from "@/api/storage";
import { ChatMessage, Ref, User } from "@/api/index";

export function createChatConnection() : HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${BaseUrl}/hub`, {
      accessTokenFactory: async () => (await getStoredToken())!
    })
    .configureLogging(LogLevel.Information)
    .build();
}

export type SignalrUser = Readonly<{
  _id: string;
} & ISignarlrUser>;

export type SignalrMessage = Readonly<{
  _id: string;
  user: SignalrUser;
  createdAt: Date;
} & IChatMessage>;

export type TypedSignalrMessage = Readonly<{
  messageType: "proposal";
} & SignalrMessage>;

function toSignalrUser(user: Ref<User>) : SignalrUser {
  const resolved = user as User;
  return { _id: resolved.id!, name: resolved.phone };
}

export function toSignalr(chatMessage: ChatMessage) : SignalrMessage {
  return { _id: chatMessage.id!, user: toSignalrUser(chatMessage.createdBy!), text: chatMessage.text, createdAt: chatMessage.createdAt! };
}

export function fromSignalr(m: SignalrMessage) : ChatMessage {
  return { id: m._id, createdBy: m.user._id, text: m.text, createdAt: m.createdAt! };
}
