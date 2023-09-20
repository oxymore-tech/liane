import { AppPressableOverlay } from "@/components/base/AppPressable";
import { Column, Row } from "@/components/base/AppLayout";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { ColorValue, StyleSheet, View } from "react-native";
import React from "react";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";

export interface ActionItemProps {
  onPress: () => void;
  color?: ColorValue;
  iconName: IconName;
  text: string;
  disabled?: boolean;
  lines?: number;
}
export const ActionItem = ({ onPress, color = AppColorPalettes.gray[800], iconName, text, disabled = false, lines = 1 }: ActionItemProps) => (
  <Item
    onPress={onPress}
    disabled={disabled}
    descriptionComponent={
      <AppText style={[styles.descriptionContainer, { color: disabled ? AppColorPalettes.gray[300] : color }]} numberOfLines={lines}>
        {text}
      </AppText>
    }
    leadingComponent={<AppIcon name={iconName} color={disabled ? AppColorPalettes.gray[300] : color} />}
  />
);

export const Item = ({
  leadingComponent,
  descriptionComponent,
  onPress,
  disabled
}: {
  leadingComponent: JSX.Element;
  descriptionComponent: JSX.Element;
  onPress: () => void;
  disabled: boolean;
}) => {
  return (
    <AppPressableOverlay disabled={disabled} foregroundColor={WithAlpha(AppColors.black, 0.1)} onPress={onPress} borderRadius={12}>
      <Column style={[{ alignItems: "center", margin: 8 }]} spacing={8}>
        {leadingComponent}
        {descriptionComponent}
      </Column>
    </AppPressableOverlay>
  );
};

const styles = StyleSheet.create({
  descriptionContainer: {
    fontSize: 12,
    fontWeight: "bold",
    flexGrow: 1,
    flexShrink: 1,
    textAlign: "center"
  },
  rowActionContainer: {
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius: 8
  }
});
