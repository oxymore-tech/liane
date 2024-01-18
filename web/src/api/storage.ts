import { AppStorage, AuthResponse, AuthUser, FullUser } from "@liane/common";

export class LocalStorageImpl implements AppStorage {
  async storeSession(authUser?: AuthUser | undefined): Promise<void> {
    await this.storeAsync("userSession", authUser);
  }

  clearStorage(): Promise<void> {
    localStorage.clear();
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
    const found = localStorage.getItem(key);
    if (!found) {
      return Promise.resolve(defaultValue);
    }
    try {
      return Promise.resolve(JSON.parse(found) as T);
    } catch (_) {
      return Promise.resolve(found as T);
    }
  }

  storeAsync<T>(key: string, value: T | undefined): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  }

  async storeUser(user?: FullUser): Promise<void> {
    await this.storeAsync("user", user);
  }

  closeSession(): Promise<void> {
    return this.clearStorage();
  }
}
