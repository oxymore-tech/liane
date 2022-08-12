import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { BaseUrl } from "@/api/http";
import { getStoredToken } from "@/api/storage";

export function getChatConnection() : HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${BaseUrl}/hub`, {
      accessTokenFactory: async (): Promise<string> => await getStoredToken() as string
    })
    .configureLogging(LogLevel.Information)
    .build();
}
