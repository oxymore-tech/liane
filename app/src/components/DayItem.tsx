import { AppColorPalettes, AppColors } from "@/theme/colors.ts";
import { StyleSheet, Text, View } from "react-native";
import { AppPressableOverlay } from "@/components/base/AppPressable.tsx";
import React from "react";

type DayItemProps = {
  day: string;
  index: number;
  selected?: boolean;
  required?: boolean;
  disabled?: boolean;
  onSelect?: (day: number) => void;
  fontSize?: number;
  size?: number;
};

export function DayItem({ day, index, selected, required, disabled, onSelect, fontSize, size }: DayItemProps) {
  return (
    <AppPressableOverlay
      disabled={disabled}
      key={index}
      onPress={() => onSelect && onSelect(index)}
      backgroundStyle={[
        styles.dayContainer,
        selected ? styles.daySelectedContainer : null,
        { borderRadius: size },
        disabled ? { borderColor: AppColorPalettes.gray[300] } : {}
      ]}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Text
        style={[
          styles.textContainer,
          selected ? styles.textSelectedContainer : null,
          { fontSize: fontSize ?? 18, textDecorationLine: disabled ? "line-through" : undefined }
        ]}>
        {day.substring(0, 2)}
      </Text>
      {required && <View style={[styles.requiredPoint, { backgroundColor: selected ? AppColors.white : AppColors.primaryColor }]} />}
    </AppPressableOverlay>
  );
}

const styles = StyleSheet.create({
  requiredPoint: {
    position: "absolute",
    width: 5,
    height: 5,
    backgroundColor: AppColors.primaryColor,
    bottom: 0,
    borderRadius: 5
  },
  dayContainer: {
    textAlign: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.white,
    borderRadius: 20,
    width: 42,
    height: 42
  },
  daySelectedContainer: {
    backgroundColor: AppColors.primaryColor
  },
  textContainer: {
    color: AppColorPalettes.gray[600],
    textAlign: "center"
  },
  textSelectedContainer: {
    color: AppColors.white
  }
});
