import { Path, useController } from "react-hook-form";
import { AppColorPalettes, ContextualColors } from "@/theme/colors";
import { Column } from "@/components/base/AppLayout";
import { TextInputProps, View } from "react-native";
import { AppStyles } from "@/theme/styles";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppText } from "@/components/base/AppText";
import React from "react";
import { AppExpandingTextInput } from "@/components/base/AppExpandingTextInput";

export const TextField = <T extends { [k: string]: string | undefined }>({
  name,
  required = true,
  minLength = 1,
  placeholder,
  label,
  expandable
}: {
  name: Path<T>;
  label: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  expandable?: boolean;
} & TextInputProps) => {
  const { field, fieldState } = useController<T, Path<T>>({ name, rules: { required, minLength } });

  let errorMessage;
  if (fieldState.invalid && fieldState.error?.type === "required") {
    errorMessage = "Ce champ est obligatoire.";
  }

  let borderColor;
  if (fieldState.invalid || (required && (!field.value || field.value.length < minLength))) {
    borderColor = ContextualColors.redAlert.bg;
  } else {
    borderColor = AppColorPalettes.gray[200];
  }

  const ph = (placeholder ?? label) + (required ? "*" : "");
  return (
    <Column>
      <AppText style={{ opacity: (field.value && field.value.length > 0) || placeholder ? 1 : 0, marginLeft: 16 }}>{label}</AppText>
      <View style={[AppStyles.inputContainer, { borderColor: borderColor }]}>
        {!expandable && <AppTextInput placeholder={ph} onChangeText={field.onChange} value={field.value} />}
        {expandable && <AppExpandingTextInput placeholder={ph} onChangeText={field.onChange} value={field.value} />}
      </View>
      {!!errorMessage && <AppText style={{ paddingHorizontal: 16, color: ContextualColors.redAlert.text }}>{errorMessage}</AppText>}
    </Column>
  );
};
