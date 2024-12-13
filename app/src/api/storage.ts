import EncryptedStorage from "react-native-encrypted-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppLogger } from "@/api/logger";
import { AppStorage as CommonAppStorage, AuthResponse, AuthUser, FullUser, GeolocationLevel } from "@liane/common";

export type AppSettings = Readonly<{
  "map.lianeTrafficAsWidth": boolean;
  "map.lianeTrafficAsColor": boolean;
  geolocation?: GeolocationLevel;
}>;

export class ReactNativeStorage implements CommonAppStorage {
  async storeAsync<T>(key: string, value: T | undefined) {
    try {
      if (value) {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      AppLogger.warn("STORAGE", "Unable to store ", key);
    }
  }

  async retrieveAsync<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        return stored ? JSON.parse(stored) : defaultValue;
      }
    } catch (e) {
      AppLogger.warn("STORAGE", "Unable to get ", key);
    }
    return defaultValue;
  }

  async storeUser(user?: FullUser) {
    try {
      if (user) {
        await this.storeEncryptedString("user", JSON.stringify(user));
      } else {
        await this.storeEncryptedString("user");
      }
    } catch (e) {
      AppLogger.warn("STORAGE", "Unable to store user", e);
    }
  }

  async getUser(): Promise<FullUser | undefined> {
    try {
      const stored = await this.getEncryptedString("user");
      if (stored) {
        return stored ? JSON.parse(stored) : undefined;
      }
    } catch (_) {}
    return undefined;
  }

  async storeEncryptedString(key: string, value?: string | undefined) {
    AppLogger.debug("STORAGE", "Store encrypted string", key, value);
    try {
      if (value) {
        await EncryptedStorage.setItem(key, value);
      } else {
        await EncryptedStorage.removeItem(key);
      }
    } catch (e) {
      AppLogger.warn("STORAGE", "Unable to store encrypted string", key, e);
    }
  }

  async getEncryptedString(key: string): Promise<string | undefined> {
    try {
      return (await EncryptedStorage.getItem(key)) as string;
    } catch (e) {
      return undefined;
    }
  }

  async storeSession(authUser?: AuthUser) {
    try {
      if (authUser) {
        await this.storeEncryptedString("user_session", JSON.stringify(authUser));
      } else {
        await this.storeEncryptedString("user_session");
      }
    } catch (e) {
      AppLogger.warn("STORAGE", "Unable to store user_session", e);
    }
  }

  async getSession(): Promise<AuthUser | undefined> {
    try {
      const stored = await this.getEncryptedString("user_session");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      AppLogger.warn("STORAGE", "Unable to get user_session", e);
    }
    return undefined;
  }

  async getAccessToken(): Promise<string | undefined> {
    return this.getEncryptedString("access_token");
  }

  async storeAccessToken(token?: string | undefined) {
    return this.storeEncryptedString("access_token", token);
  }

  async getRefreshToken(): Promise<string | undefined> {
    return this.getEncryptedString("refresh_token");
  }

  async storeRefreshToken(token?: string | undefined) {
    return this.storeEncryptedString("refresh_token", token);
  }

  async clearStorage() {
    await AsyncStorage.clear();
    await EncryptedStorage.clear();
  }

  async processAuthResponse(authResponse: AuthResponse): Promise<AuthUser> {
    await this.storeAccessToken(authResponse.token.accessToken);
    await this.storeRefreshToken(authResponse.token.refreshToken);
    return authResponse.user;
  }

  async shouldShowTutorial(name: string) {
    return !(await this.retrieveAsync<string[]>("tutorials", []))?.includes(name);
  }

  async hideTutorial(name: string) {
    const stored = (await this.retrieveAsync<string[]>("tutorials", [])) || [];
    stored.push(name);
    await this.storeAsync("tutorials", stored);
  }

  getSettings() {
    return this.retrieveAsync<AppSettings>("settings", {
      "map.lianeTrafficAsWidth": false,
      "map.lianeTrafficAsColor": false,
      geolocation: undefined
    });
  }

  async getSetting<T extends keyof AppSettings>(name: T): Promise<AppSettings[T] | undefined> {
    return (await this.getSettings())?.[name];
  }

  async saveSetting<T extends keyof AppSettings>(name: T, value: AppSettings[T]) {
    const stored = await this.getSettings();

    await this.storeAsync("settings", { ...stored, [name]: value });
  }

  async closeSession(): Promise<void> {
    // Only clear session's sensitive data
    await EncryptedStorage.clear();
    // TODO keep user's id (and name or phone) to indicate that user has been disconnected but can still retrieve his session
  }
}

export const AppStorage = new ReactNativeStorage();
