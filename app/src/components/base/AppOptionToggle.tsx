import React, { useState } from "react";
import { ColorValue, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppColors } from "@/theme/colors";

export interface AppOptionToggleProps<T> {
  options: T[];
  onSelectValue?: (option: T) => void;
  selectionColor?: ColorValue;
  defaultSelectedValue?: T;
  useFirstValueAsDefault?: boolean;
}

export const CreateAppOptionToggle =
  <T extends unknown>(formatter: (option: T) => string) =>
  ({ options, onSelectValue, defaultSelectedValue, selectionColor = AppColors.blue, useFirstValueAsDefault = true }: AppOptionToggleProps<T>) => {
    if (options.length < 2) {
      throw new Error("AppOptionToggle requires at least two options.");
    }

    if (useFirstValueAsDefault && defaultSelectedValue === undefined) {
      defaultSelectedValue = options[0];
    }

    const [selectedValue, setSelectedValue] = useState<T | undefined>(defaultSelectedValue);

    return (
      <View>
        <View style={[styles.toggleContainer, { borderColor: selectionColor }]}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={1}
              onPress={() => toggleOption(option, onSelectValue, setSelectedValue)}
              style={[styles.toggleOption, { backgroundColor: option === selectedValue ? selectionColor : AppColors.white }]}>
              <Text style={{ color: option === selectedValue ? AppColors.white : selectionColor }}>{formatter(option)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

const toggleOption = <T extends unknown>(option: T, onSelectValue: ((option: T) => void) | undefined, setSelectedValue: (option: T) => void) => {
  if (onSelectValue) {
    onSelectValue(option);
  }
  setSelectedValue(option);
};

const styles = StyleSheet.create({
  toggleContainer: {
    height: 44,
    minWidth: 216,
    backgroundColor: "white",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    padding: 2
  },
  toggleOption: {
    flex: 1,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center"
  }
});

export const AppToggle = CreateAppOptionToggle<string>(option => option);
export const AppSwitchToggle = CreateAppOptionToggle<boolean>(option => (option ? "Oui" : "Non"));
