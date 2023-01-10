import React from "react";
import { PressableProps, StyleSheet, View } from "react-native";
import { AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { AppDimensions } from "@/theme/dimensions";
import { AppIcon } from "@/components/base/AppIcon";
import { AppPressable } from "@/components/base/AppPressable";

// @ts-ignore
export interface LianeCardProps extends PressableProps {
  label?: string;
  value: string;
  onCancel?: () => void;

  // TODO define if we restrict to these colors
  color?: AppColors.white | AppColors.blue500 | AppColors.yellow500 | AppColors.orange500 | AppColors.pink500 | AppColors.blue300;
  textColor?: AppColors;
}

const CancelButton = ({ color, label, onCancel }) => {
  const cancelColor = color === AppColors.white ? AppColors.blue500 : AppColors.white;
  const cancelIconColor = cancelColor === AppColors.white ? AppColors.gray800 : AppColors.white;
  const positionStyleOverride = label ? {} : { right: -12 };

  return (
    <AppPressable style={styles.cancelContainer} backgroundStyle={[styles.cancelPressable, { backgroundColor: cancelColor }, positionStyleOverride]} onPress={onCancel}>

      <AppIcon name="close-outline" color={cancelIconColor} />

    </AppPressable>

  );
};
export function CardButton({ color = AppColors.orange500, textColor, label, value, onCancel }: LianeCardProps) {
  let finalTextColor = textColor;
  if (!textColor) {
    switch (color) {
      case AppColors.blue500:
      case AppColors.orange500:
        finalTextColor = AppColors.white;
        break;
      default:
        finalTextColor = AppColors.gray700;
    }
  }

  return (
    <View style={styles.baseContainer}>
      <AppPressable
        backgroundStyle={[{ backgroundColor: color }, styles.pressableContainer]}
        style={styles.cardContainer}
      >

        {label && (
          <AppText
            style={[{ color: finalTextColor }, styles.label]}
          >
            {label}
          </AppText>
        )}

        <AppText
          style={[{ color: finalTextColor }, styles.value]}
        >
          {value}
        </AppText>

      </AppPressable>

      {onCancel && <CancelButton color={color} label={label} onCancel={onCancel} />}
    </View>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    flex: 1
  },
  pressableContainer: {
    borderRadius: AppDimensions.borderRadius
  },
  cardContainer: {
    paddingVertical: AppDimensions.button.paddingVertical,
    paddingHorizontal: AppDimensions.button.paddingHorizontal
  },
  label: {
    fontSize: AppDimensions.textSize.default,
    fontWeight: "400",
    marginBottom: 8
  },
  value: {
    fontSize: AppDimensions.textSize.medium,
    fontWeight: "600"
  },
  cancelPressable: {
    width: 32,
    height: 32,
    borderRadius: 16,
    position: "absolute",
    right: -4,
    top: -4
  },

  cancelContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: "100%"
  }

});
