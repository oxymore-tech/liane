import { ColorValue, Pressable, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import React, { useMemo } from "react";
import { AppPressable } from "@/components/base/AppPressable";
import { AppColorPalettes, defaultTextColor } from "@/theme/colors";

export interface AppRoundedButtonProps {
  color?: ColorValue;
  backgroundColor: ColorValue;
  text: string;
  onPress?: () => void;
  opacity?: number;
  enabled?: boolean;
}
export const AppRoundedButton = ({ color, backgroundColor, text, onPress, opacity = 1, enabled = true }: AppRoundedButtonProps) => {
  color = color || defaultTextColor(backgroundColor);
  const content = useMemo(
    () => (
      <AppText
        style={{
          fontWeight: "600",
          fontSize: 14,
          color,
          textAlign: "center",
          paddingVertical: 12,
          paddingHorizontal: 8
        }}>
        {text}
      </AppText>
    ),
    [color, text]
  );
  return enabled ? (
    <AppPressable
      onPress={onPress}
      backgroundStyle={{
        backgroundColor,
        opacity,
        borderRadius: 24
      }}>
      {content}
    </AppPressable>
  ) : (
    <View
      style={{
        opacity,
        borderRadius: 24,
        backgroundColor: AppColorPalettes.gray[200]
      }}>
      {content}
    </View>
  );
};
