import React, { ReactNode } from "react";
import { Text, TextProps } from "react-native";

export interface AppTextProps extends TextProps {
  children?: ReactNode;
}

export function AppText({ style, children, ...props }: AppTextProps) {
  return (
    <Text
      style={[style]}
      {...props}
    >
      {children}
    </Text>
  );
}
