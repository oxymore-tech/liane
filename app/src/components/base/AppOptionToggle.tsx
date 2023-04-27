import { AppColors } from "@/theme/colors";
import React, { useState } from "react";

import { ColorValue, Text, TouchableOpacity, View } from "react-native";

export interface AppOptionToggleProps<T> {
  options: T[];
  onSelectValue?: (option: T) => void;
  selectionColor?: ColorValue;
  defaultSelectedValue?: T;
}

export const CreateAppOptionToggle =
  <T extends unknown>(formatter: (option: T) => string) =>
  ({ options, onSelectValue, defaultSelectedValue, selectionColor = AppColors.blue }: AppOptionToggleProps<T>) => {
    if (options.length < 2) {
      throw new Error("AppOptionToggle requires at least two options.");
    }

    if (defaultSelectedValue === undefined) {
      defaultSelectedValue = options[0];
    }

    const [selectedValue, setSelectedValue] = useState(defaultSelectedValue);

    return (
      <View>
        <View
          style={{
            height: 44,
            width: 215,
            backgroundColor: "white",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: selectionColor,
            flexDirection: "row",
            justifyContent: "center",
            padding: 2
          }}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={1}
              onPress={() => {
                if (onSelectValue) {
                  onSelectValue(option);
                }
                setSelectedValue(option);
              }}
              style={{
                flex: 1,

                backgroundColor: option === selectedValue ? selectionColor : AppColors.white,
                borderRadius: 24,
                justifyContent: "center",
                alignItems: "center"
              }}>
              <Text
                style={{
                  color: option === selectedValue ? AppColors.white : selectionColor
                }}>
                {formatter(option)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

export const AppSwitchToggle = CreateAppOptionToggle<boolean>(option => (option ? "Oui" : "Non"));
export const AppToggle = CreateAppOptionToggle<string>(option => option);
