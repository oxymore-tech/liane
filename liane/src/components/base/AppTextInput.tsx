import React from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { AppIcon, IconName } from "./AppIcon";
import { AppColors } from "@/theme/colors";

export interface AppTextInputProps extends TextInputProps {
  icon?: IconName;
}

export function AppTextInput({ icon, style, ...props }: AppTextInputProps) {
  return (
    <View style={[style]}>
      {icon && (
        <AppIcon
          name={icon}
          color={AppColors.blue500}
        />
      )}
      <TextInput
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    color: AppColors.black
  }
});
