import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AppColors } from "@/theme/colors";
import { UserPicture } from "@/components/UserPicture";
import { CoLiane, ResolvedLianeRequest } from "@liane/common";

export interface GroupsViewProps {
  liane: CoLiane;
  style?: StyleProp<ViewStyle>;
}

export const JoinedLianeView = ({ liane, style }: GroupsViewProps) => {
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
          {liane.members.map(member => (
            <UserPicture key={member.user.id} size={24} url={member.user.pictureUrl} id={member.user.id} style={{ marginLeft: -10 }} />
          ))}
        </View>
      </View>
    </View>
  );
};
