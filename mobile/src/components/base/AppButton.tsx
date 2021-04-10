import React from "react";
import { Button } from "react-native-elements";
import { ButtonProps, StyleProp, TextStyle, ViewStyle } from "react-native";
import { IconNode } from "react-native-elements/dist/icons/Icon";

export interface LianeButtonProps extends ButtonProps {
  icon?: IconNode;
  buttonStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  type?: "solid" | "clear" | "outline";
}

export function AppButton({ icon, type = "solid", buttonStyle, titleStyle, ...props }: LianeButtonProps) {
  return (
    <Button
      icon={icon}
      type={type}
      titleStyle={{ ...(titleStyle as object), fontFamily: "Inter" }}
      buttonStyle={buttonStyle}
      {...props}
    />
  );
}
