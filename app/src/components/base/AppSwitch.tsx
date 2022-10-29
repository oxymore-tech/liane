import React from "react";
import { Switch, SwitchProps } from "react-native";

export function AppSwitch({ style, ...props }: SwitchProps) {
  return (
    <Switch
      trackColor={{ false: "#767577", true: "#FF5B22" }}
      thumbColor="#f4f3f4"
      ios_backgroundColor="#3e3e3e"
      style={style}
      {...props}
    />
  );
}
