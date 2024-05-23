import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { GroupeCovoiturage } from "@/util/Mock/groups";
import { extractDays } from "@/util/hooks/days";
import { AppColors } from "@/theme/colors";
import { UserPicture } from "@/components/UserPicture";
import { MatchGroup } from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";

export interface GroupsViewProps {
  group: MatchGroup;
}

const RenderGroupsView = ({ group }: GroupsViewProps) => {
  const nouveauxMessages = true;

  return (
    <Row style={{ alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: AppColors.grayBackground }} spacing={8}>
      <View style={{ flexGrow: 1, flexShrink: 1 }}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <AppText
            style={{
              fontSize: 18,
              fontWeight: "600",
              flexShrink: 1,
              lineHeight: 27,
              color: "black"
            }}>
            {group.name}
          </AppText>
          {nouveauxMessages && (
            <View style={styles.notificationDotContainer}>
              <View style={styles.notificationDot} />
            </View>
          )}
        </View>
        <AppText
          style={{
            fontSize: 14,
            fontWeight: "600",
            flexShrink: 1,
            lineHeight: 27,
            color: "black"
          }}>{`${group.pickup} ➔ ${group.deposit}`}</AppText>
        <AppText
          style={{
            fontSize: 14,
            fontWeight: "400",
            flexShrink: 1,
            lineHeight: 16
          }}>{`${extractDays(group.weekDays)}`}</AppText>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            marginLeft: 8,
            marginTop: 5,
            marginBottom: 15
          }}>
          {group.matches.map(match => (
            <UserPicture key={match.user} size={24} url={null} id={match.user} style={{ marginLeft: -10 }} />
          ))}
        </View>
      </View>
    </Row>
  );
};

export const GroupView = ({ group }: { group: MatchGroup }) => {
  const { navigation } = useAppNavigation();

  return (
    <Pressable onPress={() => navigation.navigate("CommunitiesChat", { group: group })}>
      <RenderGroupsView group={group} />
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
    fontWeight: "600",
    flexShrink: 1,
    lineHeight: 27,
    color: "black"
  },
  notificationDotContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8 // Espace entre le texte et le point de notification
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: AppColors.orange
  }
});
