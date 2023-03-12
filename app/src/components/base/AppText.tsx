import React, { ReactNode } from "react";
import { StyleSheet, Text, TextProps } from "react-native";
import { AppDimensions } from "@/theme/dimensions";
import { AppColors, defaultTextColor } from "@/theme/colors";

export interface AppTextProps extends TextProps {
  children?: ReactNode;
}

// Text with 1 line as default value. Use negative value to remove the limit.
export function AppText({ style, children, numberOfLines = 1, ...props }: AppTextProps) {
  const internalNumberOfLines = numberOfLines < 0 ? undefined : numberOfLines;

  return (
    <Text style={[styles.text, style]} numberOfLines={internalNumberOfLines} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    flexWrap: "wrap",
    flexShrink: 1,
    fontFamily: "Inter",
    fontSize: AppDimensions.textSize.default,
    textAlignVertical: "center",
    color: defaultTextColor(AppColors.white) // default to text color on white bg
  }
});
