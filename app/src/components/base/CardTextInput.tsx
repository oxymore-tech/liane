import { StyleSheet, TextInputProps, View } from "react-native";
import { AppTextInput } from "@/components/base/AppTextInput";
import React from "react";
import { AppColors } from "@/theme/colors";

export interface CardTextInputProps extends TextInputProps {
  minHeight?: number;

  style?: any;
}

export const CardTextInput = ({ minHeight = 160, style = {}, ...props }: CardTextInputProps) => {
  return (
    <View style={[styles.card, { minHeight, justifyContent: "flex-start" }]}>
      <AppTextInput {...props} style={[styles.input, style]} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.white
  },
  input: { textAlignVertical: "top", position: "absolute", top: 0, right: 0, left: 0, bottom: 0 }
});
