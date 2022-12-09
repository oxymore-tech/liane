import React from "react";
import { Pressable, PressableProps, StyleSheet } from "react-native";
import { AppColors, AppTheme } from "@/theme/colors";
import { AppText } from "./AppText";
import { AppDimensions } from "@/theme/dimensions";

// @ts-ignore
export interface LianeButtonProps extends PressableProps {
  title?: string;
  color?: AppColors;
  disabled?: boolean;
}

export function AppButton({ color = AppColors.orange500, disabled = false, title, ...props }: LianeButtonProps) {

  const backgroundColor = disabled ? AppColors.gray400 : color;
  const textColor = disabled ? AppTheme.defaultTextColor : AppTheme.buttonTextColor;
  return (
    <Pressable
      {...props}
      style={[{ backgroundColor }, styles.container]}
      disabled={disabled}
    >

      <AppText
        style={[{ color: textColor }, styles.text]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: AppDimensions.borderRadius,
    paddingVertical: AppDimensions.button.paddingVertical,
    paddingHorizontal: AppDimensions.button.paddingHorizontal,
    alignContent: "center"
  },
  text: {
    fontSize: AppDimensions.textSize.medium,
    fontWeight: "600"
  }

});
