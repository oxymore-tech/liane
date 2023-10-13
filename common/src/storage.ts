import {AuthResponse, AuthUser} from "./api";

export interface AppStorage {
  getRefreshToken(): Promise<string | undefined>;
  getUserSession(): Promise<AuthUser | undefined>

  processAuthResponse(authResponse: AuthResponse): Promise<AuthUser>;
  clearStorage():Promise<void>;

  getAccessToken(): Promise<string | undefined>;
}