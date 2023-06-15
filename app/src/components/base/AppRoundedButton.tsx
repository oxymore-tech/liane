import { ColorValue, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import React, { useMemo } from "react";
import { AppPressableOverlay } from "@/components/base/AppPressable";
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
      <View style={styles.buttonPadding}>
        <AppText
          style={{
            fontWeight: "600",
            fontSize: 14,
            color,
            textAlign: "center",
            paddingVertical: 4
          }}>
          {text}
        </AppText>
      </View>
    ),
    [color, text]
  );
  return enabled ? (
    <AppPressableOverlay
      onPress={onPress}
      backgroundStyle={{
        backgroundColor,
        opacity,
        borderRadius: 24
      }}>
      {content}
    </AppPressableOverlay>
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

const styles = StyleSheet.create({
  buttonPadding: {
    paddingVertical: 8,
    paddingHorizontal: 12
  }
});
