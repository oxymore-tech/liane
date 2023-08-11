import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";
import { ColorValue, Pressable, StyleSheet } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const FloatingBackButton = (props: { onPress: () => void; color?: ColorValue; iconColor?: ColorValue }) => {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      style={[styles.floatingBackButton, styles.actionButton, { marginTop: 8 + insets.top }, props.color ? { backgroundColor: props.color } : {}]}
      onPress={() => {
        props.onPress();
      }}>
      <AppIcon name={"arrow-ios-back-outline"} color={props.iconColor || AppColors.white} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  floatingBackButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    position: "absolute",
    top: 0,
    backgroundColor: AppColors.darkBlue
  },
  actionButton: {
    padding: 12,
    borderRadius: 52
  },
  section: { paddingVertical: 16, marginHorizontal: 24 } //TODO app global style
});
