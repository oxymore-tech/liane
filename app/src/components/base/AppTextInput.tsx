import React, { ForwardedRef, forwardRef } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";

export interface AppTextInputProps extends TextInputProps {
  leading?: JSX.Element;
  trailing?: JSX.Element;
  placeholder?: string;
}

export const AppTextInput = forwardRef(({ leading, trailing, style, placeholder, ...props }: AppTextInputProps, ref: ForwardedRef<TextInput>) => {
  return (
    <Row style={styles.container} spacing={8}>
      {leading}
      <TextInput placeholder={placeholder} placeholderTextColor={AppColors.white} ref={ref} style={[styles.input, style]} {...props} />
      {trailing}
    </Row>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  input: {
    flex: 1,
    padding: 0,
    color: AppColorPalettes.gray[800]
  }
});
