import React, { ReactNode } from "react";
import Autocomplete, { AutocompleteProps } from "react-native-autocomplete-input";
import { AppTextInput } from "@/components/base/AppTextInput";

export interface AppAutocompleteProps<T> extends AutocompleteProps<T> {
  children?: ReactNode;
}

export function AppAutocomplete<T>({ style, ...props }: AppAutocompleteProps<T>) {
  return (
    <Autocomplete
      renderTextInput={(p) => <AppTextInput {...p} className="border-0 bg-white rounded px-1.5 py-0.5 h-12" />}
      inputContainerStyle={style}
      {...props}
    />
  );
}
