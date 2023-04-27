import { ColorValue, StyleSheet } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
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
      <AppPressable backgroundStyle={[styles.light, { backgroundColor }]} style={styles.button} onPress={onPress}>
        <WrappedIcon {...props} />
      </AppPressable>
    );
  };

export const AppIconButton = WithIconButton(AppIcon);

const styles = StyleSheet.create({
  light: {
    borderRadius: 20
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40
  }
});
