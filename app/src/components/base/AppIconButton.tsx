import { ColorValue, StyleSheet } from "react-native";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import React from "react";
import { AppPressable } from "@/components/base/AppPressable";

export interface AppIconButtonProps {
  backgroundColor: ColorValue;

  onPress: () => void;
}

const WithIconButton =
  <T,>(WrappedIcon: React.ComponentType<T>) =>
  ({ backgroundColor, onPress, ...props }: T & AppIconButtonProps) => {
    return (
      <AppPressable backgroundStyle={[styles.bg, { backgroundColor }]} style={styles.button} onPress={onPress}>
        <WrappedIcon {...props} />
      </AppPressable>
    );
  };

export const AppIconButton = WithIconButton(AppIcon);
export const AppCustomIconButton = WithIconButton(AppCustomIcon);

const styles = StyleSheet.create({
  bg: {
    borderRadius: 20
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40
  }
});
