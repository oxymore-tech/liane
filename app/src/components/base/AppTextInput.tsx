import React from "react";
import { TextInput, TextInputProps } from "react-native";

export interface AppTextInputProps extends TextInputProps {
}

export function AppTextInput({ style, ...props }: AppTextInputProps) {
  return (
    <TextInput
      className="bg-gray-100 font-sans rounded-md p-2"
      style={style}
      {...props}
    />
  );
}
