import { ControllerFieldState, useController } from "react-hook-form";
import React from "react";
import { AppLogger } from "@/api/logger";

export interface FormProps<T> {
  name: string;
  defaultValue?: T;
  rules?: { required?: boolean; validate?: (value: T, formValues: unknown) => boolean };
}

export interface BaseFormComponentProps<T> {
  value: T;
  onChange: (value: T) => void;
  fieldState: ControllerFieldState;
}

export type FormComponent<T, TProps> = (props: TProps & FormProps<T>) => React.ReactElement;
export type BaseFormComponent<T, TProps> = (props: TProps & BaseFormComponentProps<T>) => React.ReactElement;

export const WithFormController =
  <T extends unknown>(WrappedForm: BaseFormComponent<T, unknown>): FormComponent<T, unknown> =>
  ({ name, rules, defaultValue, ...props }) => {
    const rulesWithDefaults = rules || { required: true };
    if (rulesWithDefaults.required === undefined) {
      rulesWithDefaults.required = true;
    }

    const { field, fieldState } = useController({
      name,
      defaultValue,
      rules: rulesWithDefaults
    });
    if (fieldState.invalid) {
      AppLogger.debug("LOGIN", "invalid field:", field.name, fieldState.error);
    }
    return <WrappedForm value={field.value} onChange={field.onChange} fieldState={fieldState} {...props} />;
  };
