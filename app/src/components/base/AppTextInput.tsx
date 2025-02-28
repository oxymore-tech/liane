import React, { ForwardedRef, forwardRef } from "react";
import { Platform, StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { AppStyles } from "@/theme/styles";
import { AppText } from "@/components/base/AppText.tsx";

export interface AppTextInputProps extends TextInputProps {
  leading?: React.ReactElement;
  trailing?: React.ReactElement;
  placeholder?: string;
  textColor?: string;
  placeholderTextColor?: string;
  subText?: string;
}

export const AppTextInput = forwardRef(
  (
    { leading, trailing, style, textColor, placeholder, placeholderTextColor, subText, ...props }: AppTextInputProps,
    ref: ForwardedRef<TextInput>
  ) => {
    return (
      <Row spacing={8} style={styles.container}>
        {leading}
        <View style={{ flexDirection: "column", height: 52, flex: 1, alignItems: "flex-start" }}>
          <TextInput
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor ?? AppColorPalettes.gray[400]}
            ref={ref}
            style={[
              AppStyles.text,
              AppStyles.input,
              subText ? styles.inputWithSubText : styles.input,
              { color: textColor ?? AppColors.fontColor },
              style
            ]}
            {...props}
          />
          {subText && (
            <AppText style={[styles.subText, { left: Platform.OS === "android" ? 4 : 0 }]} ellipsizeMode="middle">
              {subText}
            </AppText>
          )}
        </View>
        {trailing}
      </Row>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center"
  },
  input: {
    fontSize: 18,
    flex: 1
  },
  inputWithSubText: {
    marginTop: -16,
    fontSize: 16,
    flex: 1,
    fontWeight: "bold"
  },
  subText: {
    position: "absolute",
    bottom: 8,
    fontSize: 14,
    color: AppColorPalettes.gray[500]
  }
});
