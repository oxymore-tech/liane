import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getStoredToken() {
  try {
    const token = await AsyncStorage.getItem("token");
    console.log("TOKEN STORED : " + token);
    return token;
  } catch (e) {
    return null;
  }
}