import { LianeMember } from "@liane/common";
import { Column, Row } from "@/components/base/AppLayout";
import { View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { UserPicture } from "@/components/UserPicture";
import React from "react";

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
            <Column>
              <AppText>{m.user.pseudo}</AppText>
            </Column>
          </Row>
        </AppPressableOverlay>
      ))}
    </Column>
  );
};
