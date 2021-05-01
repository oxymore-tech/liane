import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getStoredToken() {
  try {
    return await AsyncStorage.getItem("token");
  } catch (e) {
    return null;
  }
}