import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { BaseUrl } from "./http";
import { getAccessToken } from "./storage";

export function createChatConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${BaseUrl}/hub`, {
      accessTokenFactory: async () => (await getAccessToken())!
    })
    .configureLogging(LogLevel.Information)
    .build();
}
