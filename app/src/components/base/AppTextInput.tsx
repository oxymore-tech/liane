import React from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { AppIcon, IconName } from "@/components/base/AppIcon";

export interface AppTextInputProps extends TextInputProps {
  icon?: IconName;
}

export function AppTextInput({ icon, style, ...props }: AppTextInputProps) {
  return (
    <View className="bg-gray-100 font-sans rounded-md p-2 flex flex-row">
      {icon && (
      <AppIcon
        name={icon}
        className="text-2xl text-gray-400 pl-1 pr-2"
      />
      )}
      <TextInput
        className="flex-1 text-2xl"
        style={style}
        {...props}
      />
    </View>
  );
}
