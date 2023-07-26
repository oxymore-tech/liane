import { AppPressableOverlay } from "@/components/base/AppPressable";
import { Row } from "@/components/base/AppLayout";
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
}
export const ActionItem = ({ onPress, color = AppColorPalettes.gray[800], iconName, text }: ActionItemProps) => (
  <Item
    onPress={onPress}
    descriptionComponent={<AppText style={{ fontSize: 16, color, flexGrow: 1, flexShrink: 1, paddingVertical: 4 }}>{text}</AppText>}
    leadingComponent={
      <View style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
        <AppIcon name={iconName} color={color} />
      </View>
    }
  />
);

export const Item = ({
  leadingComponent,
  descriptionComponent,
  onPress
}: {
  leadingComponent: JSX.Element;
  descriptionComponent: JSX.Element;
  onPress: () => void;
}) => {
  return (
    <AppPressableOverlay foregroundColor={WithAlpha(AppColors.black, 0.1)} onPress={onPress}>
      <Row style={[styles.section, { alignItems: "center" }]} spacing={16}>
        {leadingComponent}
        {descriptionComponent}
        <AppIcon name={"chevron-right-outline"} />
      </Row>
    </AppPressableOverlay>
  );
};

const styles = StyleSheet.create({
  rowActionContainer: {
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius: 8
  },
  section: { paddingVertical: 16, marginHorizontal: 24 }
});
