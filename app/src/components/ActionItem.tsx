import { AppPressable } from "@/components/base/AppPressable";
import { Row } from "@/components/base/AppLayout";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { ColorValue, StyleSheet, View } from "react-native";
import React from "react";
import { AppColorPalettes } from "@/theme/colors";

export interface ActionItemProps {
  onPress: () => void;
  color?: ColorValue;
  iconName: IconName;
  text: string;
}
export const ActionItem = ({ onPress, color, iconName, text }: ActionItemProps) => (
  <AppPressable backgroundStyle={styles.rowActionContainer} onPress={onPress}>
    <Row style={{ alignItems: "center", padding: 16 }} spacing={8}>
      <AppIcon name={iconName} color={color} />
      <AppText style={{ fontSize: 16, color }}>{text}</AppText>
      <View style={{ flexGrow: 1, alignItems: "flex-end" }}>
        <AppIcon name={"arrow-ios-forward-outline"} />
      </View>
    </Row>
  </AppPressable>
);

const styles = StyleSheet.create({
  rowActionContainer: {
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius: 8
  }
});
