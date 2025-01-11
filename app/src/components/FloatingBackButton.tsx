import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { ColorValue, Pressable, StyleSheet } from "react-native";
import React from "react";

export const FloatingBackButton = (props: { onPress: () => void; color?: ColorValue; iconColor?: ColorValue; topOffset?: number }) => {
  return (
    <Pressable
      style={[
        styles.floatingBackButton,
        styles.actionButton,
        { top: props.topOffset ?? -2, marginTop: 8 },
        {
          backgroundColor: AppColorPalettes.gray[700]
        }
      ]}
      onPress={() => props.onPress()}>
      <AppIcon name="arrow-left" color={props.iconColor ?? AppColorPalettes.gray[100]} size={32} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  floatingBackButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    position: "absolute",
    backgroundColor: AppColors.backgroundColor,
    zIndex: 200
  },
  actionButton: {
    padding: 8,
    borderRadius: 32
  }
});
