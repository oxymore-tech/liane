import AsyncStorage from "@react-native-async-storage/async-storage";
import EncryptedStorage from "react-native-encrypted-storage";
import { Mutex } from "async-mutex";
import { AuthUser } from "@/api/index";

export async function setStoredUser(authUser?: AuthUser) {
  try {
    if (authUser) {
      return await AsyncStorage.setItem(
        "user_session",
        JSON.stringify(authUser)
      );
    }
    return await AsyncStorage.removeItem("user_session");
  } catch (error) {
    // TODO
  }
  return undefined;
}

export async function getStoredUser() : Promise<AuthUser | undefined> {
  try {
    const stored = await AsyncStorage.getItem("user_session");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    // TODO
  }
  return undefined;
}

async function storeEncryptedString(key: string, value?: string | undefined) {
  try {
    if (value) {
      return await EncryptedStorage.setItem(key, value);
    }
    return await EncryptedStorage.removeItem(key);
  } catch (e) {
    return null;
  }
}

async function getEncryptedString(key: string): Promise<string | undefined> {
  try {
    return await EncryptedStorage.getItem(key) as string;
  } catch (e) {
    return undefined;
  }
}

export async function getStoredToken(): Promise<string | undefined> {
  return getEncryptedString("token");
}

export async function setStoredToken(token?: string | undefined) {
  return storeEncryptedString("token", token);
}

const refreshTokenMutex = new Mutex();
export async function getStoredRefreshToken(): Promise<string | undefined> {
  if (refreshTokenMutex.isLocked()) return undefined;
  return refreshTokenMutex.runExclusive(async () => {
    const token = getEncryptedString("refresh_token");
    await setStoredRefreshToken(undefined);
    return token;
  });
}

export async function setStoredRefreshToken(token?: string | undefined) {
  return storeEncryptedString("refresh_token", token);
}
