import React, { ForwardedRef, forwardRef } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { AppStyles } from "@/theme/styles";

export interface AppTextInputProps extends TextInputProps {
  leading?: React.ReactElement;
  trailing?: React.ReactElement;
  placeholder?: string;
  textColor?: string;
  placeholderTextColor?: string;
}

export const AppTextInput = forwardRef(
  ({ leading, trailing, style, textColor, placeholder, placeholderTextColor, ...props }: AppTextInputProps, ref: ForwardedRef<TextInput>) => {
    return (
      <Row spacing={8} style={styles.container}>
        {leading}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor ?? AppColorPalettes.gray[400]}
          ref={ref}
          style={[AppStyles.text, AppStyles.input, styles.input, style, { color: textColor ?? AppColors.fontColor, flex: 1 }]}
          {...props}
        />
        {trailing}
      </Row>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center"
  },
  input: {
    height: 52,
    fontSize: 18
  }
});
