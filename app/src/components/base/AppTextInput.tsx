import React from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { AppIcon, IconName } from "./AppIcon";
import { AppColors } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";

export interface AppTextInputProps extends TextInputProps {
  icon?: IconName;
}

export function AppTextInput({ icon, style, ...props }: AppTextInputProps) {
  return (
    <Row style={styles.container} spacing={8}>
      {icon && <AppIcon name={icon} color={AppColors.blue500} />}
      <TextInput style={[styles.input, style]} {...props} />
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  input: {
    flex: 1,
    padding: 0,
    color: AppColors.black
  }
});
