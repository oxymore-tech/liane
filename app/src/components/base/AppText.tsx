import React, { ReactNode } from "react";
import { StyleSheet, Text, TextProps } from "react-native";
import { AppDimensions } from "@/theme/dimensions";

export interface AppTextProps extends TextProps {
  children?: ReactNode;
}

export function AppText({ style, children, ...props }: AppTextProps) {
  return (
    <Text
      style={[styles.text, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create(
  {
    text: {
      fontFamily: "Inter",
      fontSize: AppDimensions.textSize.default
    }
  }
);
