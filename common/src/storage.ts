import { AuthResponse, AuthUser, FullUser } from "./api";

export interface AppStorage extends SessionProvider {
  clearStorage(): Promise<void>;

  storeUser(user?: FullUser): Promise<void>;

  getUser(): Promise<FullUser | undefined>;

  storeAsync<T>(key: string, value: T | undefined): Promise<void>;

  retrieveAsync<T>(key: string, defaultValue?: T): Promise<T | undefined>;

  storeSession(authUser?: AuthUser): Promise<void>;
}

export interface SessionProvider {
  getRefreshToken(): Promise<string | undefined>;

  getAccessToken(): Promise<string | undefined>;

  processAuthResponse(authResponse: AuthResponse): Promise<AuthUser>;

  getSession(): Promise<AuthUser | undefined>;

  closeSession(): Promise<void>;
}
