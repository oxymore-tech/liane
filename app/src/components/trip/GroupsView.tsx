import React from "react";
import { StyleSheet, View } from "react-native";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { GroupeCovoiturage } from "@/util/Mock/groups";
import { extractDays } from "@/util/hooks/days";
import { AppColors } from "@/theme/colors";
import { UserPicture } from "@/components/UserPicture";

export interface GroupsViewProps {
  group: GroupeCovoiturage;
}

export const GroupsView = ({ group }: GroupsViewProps) => {
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
            {group.nomGroupe}
          </AppText>
          {group.nouveauxMessages && (
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
          }}>{`${group.depart} ➔ ${group.arrivee}`}</AppText>
        <AppText
          style={{
            fontSize: 14,
            fontWeight: "400",
            flexShrink: 1,
            lineHeight: 16
          }}>{`${extractDays(group.recurrence)} ${group.heureDepart}`}</AppText>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            marginLeft: 8,
            marginTop: 5,
            marginBottom: 15
          }}>
          {group.covoitureurs.map(user => (
            <UserPicture key={user.id} size={24} url={null} id={user.id.toString()} style={{ marginLeft: -10 }} />
          ))}
        </View>
      </View>
    </Row>
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
