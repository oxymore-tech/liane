import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { BaseUrl } from "./http";
import { getStoredAccessToken } from "./storage";

export function createChatConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${BaseUrl}/hub`, {
      accessTokenFactory: async () => (await getStoredAccessToken())!
    })
    .configureLogging(LogLevel.Information)
    .build();
}
