import React, { useState } from "react";
import { CardButton } from "@/components/CardButton";
import { ColorValue } from "react-native";
import { WithFormController } from "@/components/forms/WithFormController";

export interface FormCardButtonProps {
  form: JSX.Element;
  color: ColorValue;
  label: string;
  valueFormatter: (value) => string;
}

export const FormCardButton = WithFormController(
  <T extends unknown>({ form, color, label, valueFormatter, value, onChange }: FormCardButtonProps) => {
    const [lastSubmittedValue, setLastSubmittedValue] = useState();

    const onClosePopup = (validate: boolean) => {
      if (validate) {
        setLastSubmittedValue(value);
      } else {
        // Reset value
        onChange(lastSubmittedValue);
      }
    };
    return (
      <CardButton
        label={label}
        value={valueFormatter(value)}
        color={color}
        extendedView={form}
        useOkButton={true}
        onCloseExtendedView={onClosePopup}
      />
    );
  }
);
