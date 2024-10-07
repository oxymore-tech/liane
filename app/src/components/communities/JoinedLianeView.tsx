import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppColors } from "@/theme/colors";
import { UserPicture } from "@/components/UserPicture";
import { CoLiane, ResolvedLianeRequest } from "@liane/common";

export interface GroupsViewProps {
  liane: CoLiane;
}

export const JoinedLianeView = ({ liane }: GroupsViewProps) => {
  return (
    <View>
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

const styles = StyleSheet.create({
  notificationDotContainer: {
    justifyContent: "center",
    alignItems: "center"
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: AppColors.orange
  }
});
