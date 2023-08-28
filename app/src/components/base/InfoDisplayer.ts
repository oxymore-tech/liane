import { Alert, Platform, ToastAndroid } from "react-native";
export const displayInfo = (text: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(text, ToastAndroid.SHORT);
  } else {
    Alert.alert(text);
  }
};
