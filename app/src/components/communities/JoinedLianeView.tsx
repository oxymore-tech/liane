import React from "react";
import { AppAvatars } from "@/components/UserPicture";
import { CoLiane } from "@liane/common";
import { StyleSheet, View } from "react-native";
import { AppColors } from "@/theme/colors.ts";
import { Row } from "@/components/base/AppLayout.tsx";

export interface GroupsViewProps {
  liane: CoLiane;
  unread?: boolean;
}

export const JoinedLianeView = ({ liane, unread }: GroupsViewProps) => {
  const members = liane.members.length > 0 ? liane.members.map(m => m.user) : [liane.createdBy];
  return (
    <Row>
      {unread && (
        <View style={styles.notificationDotContainer}>
          <View style={styles.notificationDot} />
        </View>
      )}

      <AppAvatars users={members} size={28} max={5} />
    </Row>
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
