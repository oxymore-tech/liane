import { AppStorage, AuthResponse, AuthUser, FullUser } from "@liane/common";

export class LocalStorageImpl implements AppStorage {
  clearStorage(): Promise<void> {
    localStorage.clear();
    return Promise.resolve();
  }

  getAccessToken(): Promise<string | undefined> {
    return Promise.resolve(localStorage.getItem("token") ?? undefined);
  }

  getRefreshToken(): Promise<string | undefined> {
    return Promise.resolve(localStorage.getItem("refreshToken") ?? undefined);
  }

  getUserSession(): Promise<AuthUser | undefined> {
    const item = localStorage.getItem("userSession");
    if (!item) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(JSON.parse(item) as AuthUser);
  }

  processAuthResponse(authResponse: AuthResponse): Promise<AuthUser> {
    const { accessToken, refreshToken } = authResponse.token;
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("userSession", JSON.stringify(authResponse.user));
    return Promise.resolve(authResponse.user);
  }

  getOfflineUser(): Promise<FullUser | undefined> {
    return Promise.resolve(undefined);
  }

  storeOfflineUser(_?: FullUser): Promise<void> {
    return Promise.resolve(undefined);
  }
}
