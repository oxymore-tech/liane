import React from "react";
import { ColorValue, PressableProps, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "./AppText";
import { AppDimensions } from "@/theme/dimensions";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppPressable } from "@/components/base/AppPressable";

// @ts-ignore
export interface AppButtonProps extends PressableProps {
  title?: string;
  color?: ColorValue;
  disabled?: boolean;
  icon?: IconName;
  kind?: "circular" | "rounded";
  foregroundColor?: ColorValue;
}

export function AppButton({
  color = AppColorPalettes.orange[500],
  disabled = false,
  title,
  icon,
  kind = "rounded",
  foregroundColor,
  ...props
}: AppButtonProps) {
  const backgroundColor = disabled ? AppColorPalettes.gray[400] : color;

  const textColor = foregroundColor || (color === AppColors.white ? AppColorPalettes.gray[800] : AppColors.white);
  const borderRadius = AppDimensions.borderRadius * (kind === "rounded" ? 1 : 2);

  return (
    <AppPressable {...props} backgroundStyle={{ backgroundColor, borderRadius }} style={styles.contentContainer} disabled={disabled}>
      {icon && (
        <View style={styles.iconContainer}>
          <AppIcon name={icon} color={textColor} />
        </View>
      )}

      {title && <AppText style={[{ color: textColor }, styles.text]}>{title}</AppText>}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    paddingVertical: AppDimensions.button.paddingVertical
  },
  contentContainer: {
    flexDirection: "row",
    paddingHorizontal: AppDimensions.button.paddingHorizontal / 2
  },
  text: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: AppDimensions.button.paddingVertical,
    marginHorizontal: AppDimensions.button.paddingHorizontal / 2
  }
});
