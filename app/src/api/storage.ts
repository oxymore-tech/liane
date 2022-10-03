import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getStoredToken() {
  try {
    return await AsyncStorage.getItem("token");
  } catch (e) {
    return null;
  }
}

export async function setStoredToken(token?: string) {
  try {
    if (token) {
      return await AsyncStorage.setItem("token", token);
    }
    return await AsyncStorage.removeItem("token");
  } catch (e) {
    return null;
  }
}