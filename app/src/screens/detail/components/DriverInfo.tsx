import { User } from "@/api";
import { Item } from "@/components/ActionItem";
import { Column } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { View } from "react-native";
import { UserPicture } from "@/components/UserPicture";
import { AppColorPalettes } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";
import React from "react";

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
