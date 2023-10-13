import { AuthResponse, AuthUser, FullUser } from "./api";

export interface AppStorage {
  getRefreshToken(): Promise<string | undefined>;

  processAuthResponse(authResponse: AuthResponse): Promise<AuthUser>;

  clearStorage(): Promise<void>;

  getAccessToken(): Promise<string | undefined>;

  storeUser(user?: FullUser): Promise<void>;

  getUser(): Promise<FullUser | undefined>;

  storeAsync<T>(key: string, value: T | undefined): Promise<void>;

  retrieveAsync<T>(key: string, defaultValue?: T): Promise<T | undefined>;
}
