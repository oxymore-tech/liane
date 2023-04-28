import { AppIcon, CustomIconName, IconName } from "@/components/base/AppIcon";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { UserPicture } from "@/components/UserPicture";
import { ColorValue, Pressable, StyleSheet, View } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Item } from "@/components/ActionItem";

export const InfoItem = (props: { icon: IconName | CustomIconName; value: string }) => {
  return (
    <Row spacing={12}>
      <AppIcon name={props.icon} size={22} />
      <AppText style={{ alignSelf: "center" }}>{props.value}</AppText>
    </Row>
  );
};

export const DriverInfo = () => {
  return (
    <Item
      onPress={() => console.log("TODO profile")}
      descriptionComponent={
        <Column style={{ flexGrow: 1, flexShrink: 1 }}>
          <AppText style={{ fontSize: 16, fontWeight: "bold" }}>{"John D."} </AppText>
          <AppText style={{ fontSize: 15 }}>Novice</AppText>
        </Column>
      }
      leadingComponent={
        <View>
          <UserPicture />
          <View style={{ backgroundColor: AppColorPalettes.blue[300], borderRadius: 40, padding: 4, position: "absolute", left: 24, top: 24 }}>
            <AppIcon name={"car"} size={20} />
          </View>
        </View>
      }
    />
  );
};

export const FloatingBackButton = (props: { onPress: () => void; color?: ColorValue; iconColor?: ColorValue }) => {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      style={[styles.floatingBackButton, styles.actionButton, { marginTop: 8 + insets.top }, props.color ? { backgroundColor: props.color } : {}]}
      onPress={() => {
        props.onPress();
      }}>
      <AppIcon name={"arrow-ios-back-outline"} color={props.iconColor || AppColors.white} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  floatingBackButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    position: "absolute",
    top: 0,
    backgroundColor: AppColors.darkBlue
  },
  actionButton: {
    padding: 12,
    borderRadius: 52
  },
  section: { paddingVertical: 16, marginHorizontal: 24 } //TODO app global style
});
