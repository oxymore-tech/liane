import { AppStorage, AuthResponse, AuthUser, FullUser } from "@liane/common";
import * as localforage from "localforage";

type StorageOptions = {
  type: "session" | "local" | "dbcache";
};
export class LocalStorageImpl implements AppStorage {
  async storeSession(authUser?: AuthUser | undefined): Promise<void> {
    await this.storeAsync("userSession", authUser);
  }

  clearStorage(sources?: ("session" | "local" | "dbcache")[]): Promise<void> {
    const res = (sources || ["local"]).map(s => {
      let storageSource;
      switch (s) {
        case "dbcache":
          storageSource = localforage;
          break;
        case "local":
          storageSource = localforage;
          break;
        case "session":
          storageSource = sessionStorage;
          break;
      }
      return Promise.resolve(storageSource.clear());
    });
    return Promise.all(res).then();
  }

  getAccessToken(): Promise<string | undefined> {
    return this.retrieveAsync("token");
  }

  async getRefreshToken(): Promise<string | undefined> {
    return undefined; //this.retrieveAsync("refreshToken");
  }

  getSession(): Promise<AuthUser | undefined> {
    return this.retrieveAsync("userSession");
  }

  async processAuthResponse(authResponse: AuthResponse): Promise<AuthUser> {
    const { accessToken, refreshToken } = authResponse.token;
    await this.storeAsync("token", accessToken);
    await this.storeAsync("userSession", authResponse.user);
    return Promise.resolve(authResponse.user);
  }

  getUser(): Promise<FullUser | undefined> {
    return this.retrieveAsync("user");
  }
  async retrieveAsync<T>(key: string, defaultValue?: T, options?: StorageOptions): Promise<T | undefined> {
    const source = options?.type || "local";
    let storageSource;
    switch (source) {
      case "dbcache":
        storageSource = localforage;
        break;
      case "local":
        storageSource = localforage;
        break;
      case "session":
        storageSource = sessionStorage;
        break;
    }
    const found = await Promise.resolve(storageSource.getItem<string>(key));
    return Promise.resolve(found ? (JSON.parse(found) as T) : defaultValue);
  }
  storeAsync<T>(key: string, value: T | undefined, options?: StorageOptions): Promise<void> {
    const source = options?.type || "local";
    let storageSource;
    switch (source) {
      case "dbcache":
        storageSource = localforage;
        break;
      case "local":
        storageSource = localforage;
        break;
      case "session":
        storageSource = sessionStorage;
        break;
    }
    return Promise.resolve(storageSource.setItem<string>(key, JSON.stringify(value))).then();
  }

  async storeUser(user?: FullUser): Promise<void> {
    await this.storeAsync("user", user);
  }

  closeSession(): Promise<void> {
    return this.clearStorage();
  }
}
