import EncryptedStorage from "react-native-encrypted-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthResponse, AuthUser, FullUser } from "@/api/index";
import { AppLogger } from "@/api/logger";

export async function storeAsync<T>(key: string, value: T | undefined) {
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

export async function retrieveAsync<T>(key: string, defaultValue?: T): Promise<T | undefined> {
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

export async function storeCurrentUser(user?: FullUser) {
  try {
    if (user) {
      await storeEncryptedString("user", JSON.stringify(user));
    } else {
      await storeEncryptedString("user");
    }
  } catch (e) {
    AppLogger.warn("STORAGE", "Unable to store user", e);
  }
}

export async function getCurrentUser(): Promise<FullUser | undefined> {
  try {
    const stored = await getEncryptedString("user");
    if (stored) {
      return stored ? JSON.parse(stored) : undefined;
    }
  } catch (e) {
    AppLogger.warn("STORAGE", "Unable to get user", e);
  }
  return undefined;
}

export async function storeUserSession(authUser?: AuthUser) {
  try {
    if (authUser) {
      await storeEncryptedString("user_session", JSON.stringify(authUser));
    } else {
      await storeEncryptedString("user_session");
    }
  } catch (e) {
    AppLogger.warn("STORAGE", "Unable to store user_session", e);
  }
}

export async function getUserSession(): Promise<AuthUser | undefined> {
  try {
    const stored = await getEncryptedString("user_session");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    AppLogger.warn("STORAGE", "Unable to get user_session", e);
  }
  return undefined;
}

async function storeEncryptedString(key: string, value?: string | undefined) {
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

async function getEncryptedString(key: string): Promise<string | undefined> {
  try {
    return (await EncryptedStorage.getItem(key)) as string;
  } catch (e) {
    return undefined;
  }
}

export async function getAccessToken(): Promise<string | undefined> {
  return getEncryptedString("access_token");
}

export async function storeAccessToken(token?: string | undefined) {
  return storeEncryptedString("access_token", token);
}

export async function getRefreshToken(): Promise<string | undefined> {
  return getEncryptedString("refresh_token");
}

export async function storeRefreshToken(token?: string | undefined) {
  return storeEncryptedString("refresh_token", token);
}

export async function clearStorage() {
  await AsyncStorage.clear();
  await EncryptedStorage.clear();
}

export async function processAuthResponse(authResponse: AuthResponse): Promise<AuthUser> {
  await storeAccessToken(authResponse.token.accessToken);
  await storeRefreshToken(authResponse.token.refreshToken);
  await storeUserSession(authResponse.user);
  return authResponse.user;
}

export async function shouldShowTutorial(name: string) {
  return !(await retrieveAsync<string[]>("tutorials", []))?.includes(name);
}

export async function hideTutorial(name: string) {
  const stored = (await retrieveAsync<string[]>("tutorials", [])) || [];
  stored.push(name);
  await storeAsync("tutorials", stored);
}

export type AppSettings = Readonly<{
  "map.lianeTrafficAsWidth": boolean;
  "map.lianeTrafficAsColor": boolean;
}>;
export function getSettings() {
  return retrieveAsync<AppSettings>("settings", { "map.lianeTrafficAsWidth": false, "map.lianeTrafficAsColor": false });
}

export async function getSetting(name: keyof AppSettings) {
  const setting = (await getSettings())?.[name];
  if (setting === undefined) {
    throw new Error("Setting not found: " + name);
  }
  return setting;
}
export async function saveSetting(name: keyof AppSettings, value: any) {
  const stored = await getSettings();

  await storeAsync("settings", { ...stored, [name]: value });
}
