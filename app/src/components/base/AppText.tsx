import React, { ReactNode } from "react";
import { StyleSheet, Text, TextProps } from "react-native";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";

export interface AppTextProps extends TextProps {
  children?: ReactNode;
}

// Text with 1 line as default value. Use negative value to remove the limit.
export function AppText({ style, children, numberOfLines = 1, ...props }: AppTextProps) {
  const internalNumberOfLines = numberOfLines < 0 ? undefined : numberOfLines;

  return (
    <Text style={[styles.text, style]} ellipsizeMode="tail" numberOfLines={internalNumberOfLines} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...AppStyles.text,
    fontSize: 14,
    flexWrap: "wrap",
    flexShrink: 1,
    textAlignVertical: "center",
    color: defaultTextColor(AppColors.white) // default to text color on white bg
  }
});
