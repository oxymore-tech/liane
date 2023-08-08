import { AppIcon, IconName } from "@/components/base/AppIcon";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { UserPicture } from "@/components/UserPicture";
import { ColorValue, Pressable, StyleSheet, View } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Item } from "@/components/ActionItem";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { LianeMember, User } from "@/api";

export const InfoItem = (props: { icon: IconName; value: string }) => {
  return (
    <Row spacing={12}>
      <AppIcon name={props.icon} size={22} />
      <AppText style={{ alignSelf: "center" }}>{props.value}</AppText>
    </Row>
  );
};

export const DriverInfo = ({ user }: { user: User }) => {
  return (
    <Item
      onPress={() => console.log("TODO profile")}
      descriptionComponent={
        <Column style={{ flexGrow: 1, flexShrink: 1 }}>
          <AppText style={{ fontSize: 16, fontWeight: "bold" }}>{user.pseudo} </AppText>
          <AppText style={{ fontSize: 15 }}>Jeune pousse</AppText>
        </Column>
      }
      leadingComponent={
        <View>
          <UserPicture url={user.pictureUrl} id={user.id} />
          <View style={{ backgroundColor: AppColorPalettes.blue[300], borderRadius: 40, padding: 4, position: "absolute", left: 24, top: 24 }}>
            <AppIcon name={"car"} size={20} />
          </View>
        </View>
      }
    />
  );
};

export const ActionFAB = (props: { onPress: () => void; color: ColorValue; icon: IconName }) => {
  return (
    <Pressable
      style={[styles.actionButton, { backgroundColor: props.color, padding: 8 }]}
      onPress={() => {
        props.onPress();
      }}>
      <AppIcon name={props.icon} color={defaultTextColor(props.color)} />
    </Pressable>
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

export const PassengerListView = (props: { members: LianeMember[] }) => {
  return (
    <Column spacing={12}>
      <View style={{ paddingTop: 16, paddingHorizontal: 24 }}>
        <AppText style={{ fontWeight: "bold", fontSize: 16 }}>Passagers ({props.members.length})</AppText>
      </View>
      {props.members.map(m => (
        <AppPressableOverlay key={m.user.id} style={{ paddingVertical: 12, paddingHorizontal: 24 }}>
          <Row spacing={24} style={{ alignItems: "center" }}>
            <UserPicture id={m.user.id} url={m.user.pictureUrl} />
            <AppText>{m.user.pseudo}</AppText>
          </Row>
        </AppPressableOverlay>
      ))}
    </Column>
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
