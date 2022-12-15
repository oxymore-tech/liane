import React from "react";
import { Pressable, PressableProps, StyleSheet, View } from "react-native";
import { AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { AppDimensions } from "@/theme/dimensions";
import { AppIcon } from "@/components/base/AppIcon";

// @ts-ignore
export interface LianeCardProps extends PressableProps {
  label: string | undefined;
  value: string;
  onCancel?: () => void;

  // TODO define if we restrict to these colors
  color?: AppColors.white | AppColors.blue500 | AppColors.yellow500 | AppColors.orange500 | AppColors.pink500;
  textColor?: AppColors;
}

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

  const CancelButton = () => {
    const cancelColor = color === AppColors.white ? AppColors.blue500 : AppColors.white;
    const cancelIconColor = cancelColor === AppColors.white ? AppColors.gray800 : AppColors.white;

    return (
      <Pressable style={[styles.cancelPressable, { backgroundColor: cancelColor }]} onPress={onCancel}>
        {({ pressed }) => (
          <View style={styles.cancelContainer}>
            <AppIcon name="close-outline" color={cancelIconColor} />
            {pressed && (<View style={styles.pressed} />)}
          </View>
        )}
      </Pressable>

    );
  };

  return (
    <View style={styles.baseContainer}>
      <Pressable
        style={[{ backgroundColor: color }, styles.pressableContainer]}
      >
        {({ pressed }) => (
          <View style={styles.cardContainer}>
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
            {pressed && (<View style={styles.pressed} />)}
          </View>
        )}
      </Pressable>

      {onCancel && <CancelButton />}
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
  pressed: {
    position: "absolute",
    right: 0,
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: AppDimensions.borderRadius
  },
  cancelContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: "100%"
  }

});
