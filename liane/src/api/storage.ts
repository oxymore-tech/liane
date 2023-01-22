import EncryptedStorage from "react-native-encrypted-storage";
import { AuthResponse, AuthUser } from "@/api/index";

export async function storeUserSession(authUser?: AuthUser) {
  try {
    if (authUser) {
      await storeEncryptedString("user_session", JSON.stringify(authUser));
    } else {
      await storeEncryptedString("user_session");
    }
  } catch (e) {
    console.warn("Unable to store user_session", e);
  }
}

export async function getUserSession(): Promise<AuthUser | undefined> {
  try {
    const stored = await getEncryptedString("user_session");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Unable to get user_session", e);
  }
  return undefined;
}

async function storeEncryptedString(key: string, value?: string | undefined) {
  if (__DEV__) {
    console.debug("Store encrypted string", key, value);
  }
  try {
    if (value) {
      await EncryptedStorage.setItem(key, value);
    } else {
      await EncryptedStorage.removeItem(key);
    }
  } catch (e) {
    console.warn("Unable to store encrypted string", key, e);
  }
}

async function getEncryptedString(key: string): Promise<string | undefined> {
  try {
    return (await EncryptedStorage.getItem(key)) as string;
  } catch (e) {
    return undefined;
  }
}

export async function getStoredAccessToken(): Promise<string | undefined> {
  return getEncryptedString("access_token");
}

export async function storeAccessToken(token?: string | undefined) {
  return storeEncryptedString("access_token", token);
}

export async function getStoredRefreshToken(): Promise<string | undefined> {
  return getEncryptedString("refresh_token");
}

export async function storeRefreshToken(token?: string | undefined) {
  return storeEncryptedString("refresh_token", token);
}

export async function clearStorage() {
  await storeAccessToken(undefined);
  await storeRefreshToken(undefined);
  await storeUserSession(undefined);
}

export async function processAuthResponse(authResponse: AuthResponse): Promise<AuthUser> {
  await storeAccessToken(authResponse.token.accessToken);
  await storeRefreshToken(authResponse.token.refreshToken);
  await storeUserSession(authResponse.user);
  return authResponse.user;
}
