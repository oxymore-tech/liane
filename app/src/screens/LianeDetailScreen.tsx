import { Liane } from "@/api";
import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { formatDateTime } from "@/api/i18n";
import { useAppNavigation } from "@/api/navigation";
import { AppContext } from "@/components/ContextProvider";
import { DetailedWayPointView } from "@/components/trip/WayPointsView";
import { TripOverview } from "@/components/map/TripOverviewMap";
import { ActionItem } from "@/components/ActionItem";

const LianeDetail = ({ liane }: { liane: Liane }) => {
  const { user, services } = useContext(AppContext);
  const { navigation } = useAppNavigation<"LianeDetail">();
  const currentUserIsOwner = liane.createdBy === user!.id;
  const currentUserIsDriver = liane.driver.user === user!.id;
  const dateTime = formatDateTime(new Date(liane.departureTime));
  return (
    <ScrollView>
      <Column>
        <View style={styles.section}>
          <DetailedWayPointView wayPoints={liane.wayPoints} departureTime={liane.departureTime} />
        </View>
        <View style={styles.separator} />
        <Column style={styles.tagsContainer} spacing={8}>
          <Row
            style={[
              styles.tag,
              {
                backgroundColor: AppColorPalettes.yellow[200]
              }
            ]}
            spacing={8}>
            <AppIcon name={"calendar-outline"} />
            <AppText style={{ fontSize: 16 }}>{dateTime}</AppText>
          </Row>
          <Row
            style={[
              styles.tag,
              {
                backgroundColor: AppColorPalettes.gray[200]
              }
            ]}
            spacing={8}>
            <AppIcon name={"people-outline"} />
            <AppText style={{ fontSize: 16 }}>{liane.members.length + " membre" + (liane.members.length > 1 ? "s" : "")}</AppText>
          </Row>
        </Column>
        <View style={{ paddingHorizontal: 24 }}>
          <TripOverview params={{ liane }} />
        </View>
        <View style={styles.separator} />
        <Row style={[styles.section, { alignItems: "center" }]} spacing={16}>
          <View
            style={{
              backgroundColor: liane.driver.canDrive ? ContextualColors.greenValid.light : ContextualColors.redAlert.light,
              padding: 12,
              borderRadius: 52
            }}>
            <AppIcon name={liane.driver.canDrive ? "car-check-mark" : "car-strike-through"} size={28} />
          </View>
          <Column spacing={2}>
            <AppText style={{ fontSize: 16 }}>{liane.driver.canDrive ? "John Doe" : "Aucun conducteur"} </AppText>
            {__DEV__ && <AppText style={{ fontSize: 12 }}>{liane.driver.user} </AppText>}
          </Column>
        </Row>
        <View style={styles.separator} />

        <Column spacing={8} style={styles.actionsContainer}>
          {liane.conversation && (
            <ActionItem
              onPress={() => navigation.navigate("Chat", { conversationId: liane.group })}
              iconName={"message-circle-outline"}
              text={"Aller à la conversation"}
            />
          )}
          {!liane.conversation && <AppText>Cette liane est en attente de nouveaux membres.</AppText>}
          {currentUserIsDriver && <ActionItem onPress={() => {}} iconName={"clock-outline"} text={"Modifier l'horaire"} />}
          {currentUserIsOwner && (
            <ActionItem
              onPress={() => {
                // TODO
                Alert.alert("Supprimer l'annonce", "Voulez-vous vraiment supprimer cette liane ?", [
                  {
                    text: "Annuler",
                    onPress: () => {},
                    style: "cancel"
                  },
                  {
                    text: "Supprimer",
                    onPress: async () => {
                      await services.liane.delete(liane.id!);
                    },
                    style: "default"
                  }
                ]);
              }}
              color={ContextualColors.redAlert.text}
              iconName={"trash-outline"}
              text={"Supprimer l'annonce"}
            />
          )}
          {!currentUserIsOwner && (
            <ActionItem
              onPress={() => {
                // TODO
                Alert.alert("Quitter la liane", "Voulez-vous vraiment quitter cette liane ?", [
                  {
                    text: "Annuler",
                    onPress: () => {},
                    style: "cancel"
                  },
                  {
                    text: "Supprimer",
                    onPress: async () => {
                      //TODO
                    },
                    style: "default"
                  }
                ]);
              }}
              color={ContextualColors.redAlert.text}
              iconName={"log-out-outline"}
              text={"Quitter la liane"}
            />
          )}
        </Column>
      </Column>
    </ScrollView>
  );
};

export const LianeDetailScreen = () => {
  const { route, navigation } = useAppNavigation<"LianeDetail">();
  const { services } = useContext(AppContext);
  const lianeParam = route.params!.liane;
  const insets = useSafeAreaInsets();
  const [liane, setLiane] = useState(typeof lianeParam === "string" ? undefined : lianeParam);

  useEffect(() => {
    if (typeof lianeParam === "string") {
      services.liane.get(lianeParam).then(l => setLiane(l));
    }
  }, [lianeParam, services.liane]);

  return (
    <View style={styles.page}>
      <Row style={[styles.footerContainer, { paddingTop: insets.top + 12 }]}>
        <Pressable style={{ paddingVertical: 8, paddingHorizontal: 16 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} size={24} color={defaultTextColor(AppColors.yellow)} />
        </Pressable>
        <AppText style={styles.title}>Détails de la Liane</AppText>
      </Row>
      {liane && <LianeDetail liane={liane} />}
      {!liane && <ActivityIndicator />}
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: AppColors.white
  },
  title: {
    color: defaultTextColor(AppColors.yellow),
    fontSize: 20,
    textAlignVertical: "center",
    fontWeight: "500"
  },
  section: { paddingVertical: 16, marginHorizontal: 24 },
  actionsContainer: {
    marginVertical: 8,
    marginHorizontal: 24
  },
  rowActionContainer: {
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius: 8
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center"
  },
  tagsContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "flex-start"
  },
  footerContainer: {
    backgroundColor: AppColors.yellow,
    paddingVertical: 12,
    alignItems: "center"
  },
  separator: {
    marginHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: AppColorPalettes.gray[200],
    marginBottom: 4
  }
});
