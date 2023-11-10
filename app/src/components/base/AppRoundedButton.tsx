import { ColorValue, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import React, { useMemo } from "react";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { Row } from "@/components/base/AppLayout";

export interface AppRoundedButtonProps {
  color?: ColorValue;
  backgroundColor: ColorValue;
  text: string;
  onPress?: () => void;
  opacity?: number;
  enabled?: boolean;
  flex?: number | undefined;
  icon?: IconName;
}
export const AppRoundedButton = ({ color, backgroundColor, text, onPress, opacity = 1, enabled = true, flex, icon }: AppRoundedButtonProps) => {
  color = color ?? defaultTextColor(backgroundColor);
  const content = useMemo(
    () => (
      <Row style={[styles.buttonPadding, { justifyContent: "center", alignItems: "center" }]} spacing={4}>
        <AppText
          style={{
            fontWeight: "bold",
            fontSize: 14,
            color,
            textAlign: "center",
            paddingVertical: 4
          }}>
          {text}
        </AppText>
        {icon && <AppIcon name={icon} color={AppColors.white} />}
      </Row>
    ),
    [color, text]
  );
  return enabled ? (
    <AppPressableOverlay
      onPress={onPress}
      backgroundStyle={{
        backgroundColor,
        opacity,
        borderRadius: 24,
        flex
      }}>
      {content}
    </AppPressableOverlay>
  ) : (
    <View
      style={{
        opacity,
        borderRadius: 24,
        flex,
        backgroundColor: AppColorPalettes.gray[200]
      }}>
      {content}
    </View>
  );
};

export interface AppRoundedButtonOutlineProps {
  color: ColorValue;
  text: string;
  onPress?: () => void;
  opacity?: number;
  enabled?: boolean;
}
export const AppRoundedButtonOutline = ({ color, text, onPress, opacity = 1, enabled = true }: AppRoundedButtonOutlineProps) => {
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
        borderColor: color,
        borderWidth: 2,
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
        borderWidth: 2,
        borderColor: AppColorPalettes.gray[200]
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
