import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { BaseUrl } from "./http";
import { getStoredToken } from "./storage";

export function createChatConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${BaseUrl}/hub`, {
      accessTokenFactory: async () => (await getStoredToken())!
    })
    .configureLogging(LogLevel.Information)
    .build();
}
