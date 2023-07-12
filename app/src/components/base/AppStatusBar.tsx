import { StatusBar, StatusBarStyle } from "react-native";
import React from "react";
import { useIsFocused } from "@react-navigation/native";

export const AppStatusBar = (props: { style: StatusBarStyle }) => {
  const isFocused = useIsFocused();
  return isFocused ? <StatusBar translucent backgroundColor="transparent" barStyle={props.style} /> : null;
};
