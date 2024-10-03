import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { extractDays } from "@/util/hooks/days";
import { AppColors } from "@/theme/colors";
import { UserPicture } from "@/components/UserPicture";
import { useAppNavigation } from "@/components/context/routing";
import { Row } from "@/components/base/AppLayout.tsx";
import { CoLiane, ResolvedLianeRequest } from "@liane/common";

export interface GroupsViewProps {
  lianeRequest: ResolvedLianeRequest;
  liane: CoLiane;
  unreadMessage?: boolean;
}

export const JoinedLianeView = ({ lianeRequest, liane, unreadMessage }: GroupsViewProps) => {
  const { navigation } = useAppNavigation();

  return (
    <Pressable onPress={() => navigation.navigate("CommunitiesChat", { liane: liane })}>
      <View style={{ flexGrow: 1, flexShrink: 1 }}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          {unreadMessage && (
            <View style={styles.notificationDotContainer}>
              <View style={styles.notificationDot} />
            </View>
          )}
        </View>
        <Row style={{ alignItems: "flex-start", flexWrap: "wrap" }} spacing={4}>
          <AppText
            style={{
              fontSize: 14,
              fontWeight: "bold",
              flexShrink: 1,
              lineHeight: 14,
              color: "black"
            }}>
            {`${lianeRequest.wayPoints[0].label} ➔`}
          </AppText>
          <AppText
            style={{
              fontSize: 14,
              fontWeight: "bold",
              flexShrink: 1,
              lineHeight: 14,
              color: "black"
            }}>
            {`${lianeRequest.wayPoints[1].label}`}
          </AppText>
        </Row>

        <AppText
          style={{
            fontSize: 14,
            fontWeight: "400",
            flexShrink: 1,
            lineHeight: 20
          }}>{`${extractDays(lianeRequest.weekDays)}`}</AppText>
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
    </Pressable>
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
