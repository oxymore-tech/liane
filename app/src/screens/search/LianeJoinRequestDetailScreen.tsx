import { Compatible, JoinLianeRequestDetailed } from "@/api";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { formatDateTime } from "@/api/i18n";
import { LianeDetailedMatchView } from "@/components/trip/LianeMatchView";
import { formatDuration } from "@/util/datetime";
import { useAppNavigation } from "@/api/navigation";
import { TripChangeOverview, TripOverview } from "@/components/map/TripOverviewMap";
import { AppPressable } from "@/components/base/AppPressable";

const formatSeatCount = (seatCount: number) => {
  let count = seatCount;
  let words: string[];
  if (seatCount > 0) {
    // offered seats
    words = ["place", "disponible"];
  } else {
    // passengers
    count = -seatCount;
    words = ["passager"];
  }
  return `${count} ${words.map(word => word + (count > 1 ? "s" : "")).join(" ")}`;
};

export const LianeJoinRequestDetailScreen = () => {
  const { route, navigation } = useAppNavigation<"LianeJoinRequestDetail">();
  const request: JoinLianeRequestDetailed = route.params!.request;
  const insets = useSafeAreaInsets();
  const isExactMatch = request.match.type === "Exact";

  const formattedDepartureTime = formatDateTime(new Date(request.targetLiane.departureTime));
  const formattedSeatCount = formatSeatCount(request.seats);
  const driverLabel = request.targetLiane.driver ? "John Doe" : "Aucun conducteur";

  return (
    <View style={styles.page}>
      <Row style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <Pressable style={{ paddingVertical: 8, paddingHorizontal: 16 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} size={24} color={defaultTextColor(AppColors.yellow)} />
        </Pressable>
        <AppText style={styles.title}>Détails du trajet</AppText>
      </Row>
      <ScrollView>
        <View style={styles.section}>
          <LianeDetailedMatchView
            from={request.from}
            to={request.to}
            departureTime={request.targetLiane.departureTime}
            originalTrip={request.targetLiane.wayPoints}
            newTrip={request.wayPoints}
          />
        </View>
        <View style={styles.separator} />
        <Column style={styles.tagsContainer} spacing={8}>
          <Row
            style={[
              styles.tag,
              {
                backgroundColor: AppColorPalettes.yellow[100]
              }
            ]}
            spacing={8}>
            <AppIcon name={"calendar-outline"} />
            <AppText style={{ fontSize: 16 }}>{formattedDepartureTime}</AppText>
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
            <AppText style={{ fontSize: 16 }}>{formattedSeatCount}</AppText>
          </Row>

          {isExactMatch && <TripOverview params={{ liane: request.targetLiane }} />}
          {!isExactMatch && (
            <Column>
              <TripChangeOverview params={{ liane: request.targetLiane, newWayPoints: request.wayPoints }} />
              <AppText>Ce trajet fait faire un détour de {formatDuration((request.match as Compatible).deltaInSeconds)} à John Doe</AppText>
            </Column>
          )}
        </Column>
        <View style={styles.separator} />
        <Row style={[styles.section, { alignItems: "center" }]} spacing={16}>
          <View
            style={{
              backgroundColor: request.targetLiane.driver ? ContextualColors.greenValid.bg : ContextualColors.redAlert.bg,
              padding: 12,
              borderRadius: 52
            }}>
            <AppCustomIcon name={request.targetLiane.driver ? "car-check-mark" : "car-strike-through"} size={36} />
          </View>
          <AppText style={{ fontSize: 18 }}>{driverLabel} </AppText>
        </Row>
        <View style={styles.separator} />

        <Column style={styles.section}>
          <AppPressable
            backgroundStyle={[styles.rowActionContainer]}
            onPress={() => {
              // TODO
            }}>
            <Row style={{ alignItems: "center", padding: 16 }} spacing={8}>
              <AppIcon name={"close-outline"} color={ContextualColors.redAlert.text} />
              <AppText style={{ fontSize: 16, color: ContextualColors.redAlert.text }}>Annuler la demande</AppText>
              <View style={{ flexGrow: 1, alignItems: "flex-end" }}>
                <AppIcon color={ContextualColors.redAlert.text} name={"arrow-ios-forward-outline"} />
              </View>
            </Row>
          </AppPressable>
        </Column>
      </ScrollView>
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
  headerContainer: {
    backgroundColor: AppColors.yellow,
    paddingVertical: 12,
    alignItems: "center"
  },
  separator: {
    marginHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: AppColorPalettes.gray[200],
    marginBottom: 4
  },
  exactMatchBg: {
    backgroundColor: ContextualColors.greenValid.bg
  },
  compatibleMatchBg: {
    backgroundColor: ContextualColors.orangeWarn.bg
  }
});