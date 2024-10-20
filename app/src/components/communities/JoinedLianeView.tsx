import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { UserPicture } from "@/components/UserPicture";
import { CoLiane } from "@liane/common";

export interface GroupsViewProps {
  liane: CoLiane;
  style?: StyleProp<ViewStyle>;
}

export const JoinedLianeView = ({ liane, style }: GroupsViewProps) => {
  const members = liane.members.length > 0 ? liane.members.map(m => m.user) : [liane.createdBy];
  return (
    <View style={style}>
      <View style={{ flexGrow: 1, flexShrink: 1 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            marginLeft: 8,
            marginTop: 5
          }}>
          {members.map(member => (
            <UserPicture key={member.id} size={24} url={member.pictureUrl} id={member.id} style={{ marginLeft: -10 }} />
          ))}
        </View>
      </View>
    </View>
  );
};
