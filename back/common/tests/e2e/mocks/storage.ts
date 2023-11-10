import { AppStorage, AuthResponse, AuthUser, FullUser } from "../../../src";

export class LocalStorageImpl implements AppStorage {
  private storage: { [k: string]: any } = {};
  async storeSession(authUser?: AuthUser | undefined): Promise<void> {
    await this.storeAsync("userSession", authUser);
  }
  clearStorage(): Promise<void> {
    this.storage = {};
    return Promise.resolve();
  }

  getAccessToken(): Promise<string | undefined> {
    return this.retrieveAsync("token");
  }

  getRefreshToken(): Promise<string | undefined> {
    return this.retrieveAsync("refreshToken");
  }

  getSession(): Promise<AuthUser | undefined> {
    return this.retrieveAsync("userSession");
  }

  async processAuthResponse(authResponse: AuthResponse): Promise<AuthUser> {
    const { accessToken, refreshToken } = authResponse.token;
    await this.storeAsync("token", accessToken);
    await this.storeAsync("refreshToken", refreshToken);
    await this.storeAsync("userSession", authResponse.user);
    return Promise.resolve(authResponse.user);
  }
  getUser(): Promise<FullUser | undefined> {
    return this.retrieveAsync("user");
  }
  retrieveAsync<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    return Promise.resolve(this.storage[key] ?? defaultValue);
  }
  storeAsync<T>(key: string, value: T | undefined): Promise<void> {
    this.storage[key] = value;
    return Promise.resolve();
  }

  async storeUser(user?: FullUser): Promise<void> {
    await this.storeAsync("user", user);
  }
}
