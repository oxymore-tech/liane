import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { BaseUrl } from "@/api/http";
import { getStoredToken } from "@/api/storage";

export function createChatConnection() : HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${BaseUrl}/hub`, {
      accessTokenFactory: async () => (await getStoredToken())!
    })
    .configureLogging(LogLevel.Information)
    .build();
}
