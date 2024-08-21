import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { extractDays } from "@/util/hooks/days";
import { AppColors } from "@/theme/colors";
import { UserPicture } from "@/components/UserPicture";
import { MatchGroup } from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";
import { Row } from "@/components/base/AppLayout.tsx";

export interface GroupsViewProps {
  joinedLiane: MatchGroup;
  unreadMessage?: boolean;
}

const RenderGroupsView = ({ joinedLiane, unreadMessage }: GroupsViewProps) => {
  return (
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
          {`${joinedLiane.pickup.label} ➔`}
        </AppText>
        <AppText
          style={{
            fontSize: 14,
            fontWeight: "bold",
            flexShrink: 1,
            lineHeight: 14,
            color: "black"
          }}>
          {`zerfergergregergerger ezfez fez fz zfze fzef ezf zef zef zef ze fze e`}
        </AppText>
      </Row>

      <AppText
        style={{
          fontSize: 14,
          fontWeight: "400",
          flexShrink: 1,
          lineHeight: 20
        }}>{`${extractDays(joinedLiane.weekDays)}`}</AppText>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          marginLeft: 8,
          marginTop: 5
        }}>
        {joinedLiane.liane.members.map(member => (
          <UserPicture key={member.user.id} size={24} url={member.user.pictureUrl} id={member.user.id} style={{ marginLeft: -10 }} />
        ))}
      </View>
    </View>
  );
};

export const JoinedLianeView = ({ joinedLiane, unreadMessage }: GroupsViewProps) => {
  const { navigation } = useAppNavigation();

  return (
    <Pressable onPress={() => navigation.navigate("CommunitiesChat", { liane: joinedLiane.liane })}>
      <RenderGroupsView joinedLiane={joinedLiane} unreadMessage={unreadMessage} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" // Centre verticalement les éléments dans le conteneur
  },
  groupName: {
    fontSize: 18,
    fontWeight: "bold",
    flexShrink: 1,
    lineHeight: 27,
    color: "black"
  },
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
