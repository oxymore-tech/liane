import React, { ForwardedRef, forwardRef } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { AppStyles } from "@/theme/styles";

export interface AppTextInputProps extends TextInputProps {
  leading?: JSX.Element;
  trailing?: JSX.Element;
  placeholder?: string;
  textColor?: string;
  placeholderTextColor?: string;
}

export const AppTextInput = forwardRef(
  ({ leading, trailing, style, textColor, placeholder, placeholderTextColor, ...props }: AppTextInputProps, ref: ForwardedRef<TextInput>) => {
    return (
      <Row style={styles.container} spacing={8}>
        {leading}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor ?? AppColorPalettes.gray[700]}
          ref={ref}
          style={[AppStyles.text, AppStyles.input, styles.input, style, { color: textColor ?? AppColors.fontColor }]}
          {...props}
        />
        {trailing}
      </Row>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  input: {
    flex: 1,
    padding: 0
  }
});
