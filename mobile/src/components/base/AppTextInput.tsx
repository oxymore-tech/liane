import React from 'react';
import { TextInput, TextInputProps } from "react-native";

export interface AppTextInputProps extends TextInputProps {
}

export function AppTextInput({style, ...props}: AppTextInputProps) {
  return <TextInput
    style={{...(style as object), fontFamily: "Inter"}}
    {...props}
  />
}
