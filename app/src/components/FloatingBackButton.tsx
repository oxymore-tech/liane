import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";
import { ColorValue, Pressable, StyleSheet } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const FloatingBackButton = (props: { onPress: () => void; color?: ColorValue; iconColor?: ColorValue; topOffset?: number }) => {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      style={[
        styles.floatingBackButton,
        styles.actionButton,
        { top: props.topOffset ?? 12, marginTop: 8 + insets.top },
        props.color ? { backgroundColor: props.color } : {}
      ]}
      onPress={() => props.onPress()}>
      <AppIcon name={"arrow-ios-back-outline"} color={props.iconColor ?? AppColors.primaryColor} size={32} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  floatingBackButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    position: "absolute",
    backgroundColor: AppColors.backgroundColor
  },
  actionButton: {
    padding: 8,
    borderRadius: 18
  },
  section: { paddingVertical: 16, marginHorizontal: 24 } //TODO app global style
});
