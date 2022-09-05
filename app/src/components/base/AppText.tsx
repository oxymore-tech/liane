import React, { ReactNode } from "react";
import { Text, TextProps } from "react-native";

export interface AppTextProps extends TextProps {
  children?: ReactNode;
}

export function AppText({ style, children, ...props }: AppTextProps) {
  return (
    <Text
      style={{ fontFamily: "Inter", ...(style as object) }}
      {...props}
    >
      {children}
    </Text>
  );
}
