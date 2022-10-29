import React, { ReactNode } from "react";
import Autocomplete, { AutocompleteProps } from "react-native-autocomplete-input";

export interface AppAutocompleteProps<T> extends AutocompleteProps<T> {
  children?: ReactNode;
}

export function AppAutocomplete<T>({ style, ...props }: AppAutocompleteProps<T>) {
  return (
    <Autocomplete
      inputContainerStyle={style}
      {...props}
    />
  );
}
