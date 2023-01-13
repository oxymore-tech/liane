import AsyncStorage from "@react-native-async-storage/async-storage";
import EncryptedStorage from "react-native-encrypted-storage";
import { AuthResponse, AuthUser } from "@/api/index";
import { Subject } from "@/util/observer";

export const StoredUser = new Subject<AuthUser | undefined>(undefined);

export async function setStoredUser(authUser?: AuthUser) {
  try {
    if (authUser) {
      await AsyncStorage.setItem(
        "user_session",
        JSON.stringify(authUser)
      );
    } else { await AsyncStorage.removeItem("user_session"); }
    StoredUser.update(authUser);
  } catch (error) {
    // TODO
  }

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

export async function getStoredRefreshToken(): Promise<string | undefined> {
  return getEncryptedString("refresh_token");
}

export async function setStoredRefreshToken(token?: string | undefined) {
  return storeEncryptedString("refresh_token", token);
}

export async function clearStorage() {
  await setStoredToken(undefined);
  await setStoredRefreshToken(undefined);
  await setStoredUser(undefined);
}
export async function processAuthResponse(authResponse: AuthResponse) : Promise<AuthUser> {
  await setStoredToken(authResponse.token.accessToken);
  await setStoredRefreshToken(authResponse.token.refreshToken);
  await setStoredUser(authResponse.user);
  return authResponse.user;
}