import AsyncStorage from "@react-native-async-storage/async-storage";
import EncryptedStorage from "react-native-encrypted-storage";
import { AuthResponse, AuthUser } from "@/api/index";

export async function setStoredUser(authUser?: AuthUser) {
  try {
    if (authUser) {
      await AsyncStorage.setItem(
        "user_session",
        JSON.stringify(authUser)
      );
    } else {
      await AsyncStorage.removeItem("user_session");
    }
  } catch (e) {
    console.warn("Unable to store user_session", e);
  }
}

export async function getStoredUser() : Promise<AuthUser | undefined> {
  try {
    const stored = await AsyncStorage.getItem("user_session");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Unable to get user_session", e);
  }
  return undefined;
}

async function storeEncryptedString(key: string, value?: string | undefined) {
  try {
    if (value) {
      await EncryptedStorage.setItem(key, value);
    }
    await EncryptedStorage.removeItem(key);
  } catch (e) {
    console.warn("Unable to store encrypted string", key, e);
  }
}

async function getEncryptedString(key: string): Promise<string | undefined> {
  try {
    return await EncryptedStorage.getItem(key) as string;
  } catch (e) {
    return undefined;
  }
}

export async function getStoredAccessToken(): Promise<string | undefined> {
  return getEncryptedString("access_token");
}

export async function setStoredAccessToken(token?: string | undefined) {
  return storeEncryptedString("access_token", token);
}

export async function getStoredRefreshToken(): Promise<string | undefined> {
  return getEncryptedString("refresh_token");
}

export async function setStoredRefreshToken(token?: string | undefined) {
  return storeEncryptedString("refresh_token", token);
}

export async function clearStorage() {
  await setStoredAccessToken(undefined);
  await setStoredRefreshToken(undefined);
  await setStoredUser(undefined);
}

export async function processAuthResponse(authResponse: AuthResponse) : Promise<AuthUser> {
  await setStoredAccessToken(authResponse.token.accessToken);
  await setStoredRefreshToken(authResponse.token.refreshToken);
  await setStoredUser(authResponse.user);
  return authResponse.user;
}