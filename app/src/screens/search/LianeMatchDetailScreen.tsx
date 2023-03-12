import { Compatible, LianeMatch } from "@/api";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { formatDateTime } from "@/api/i18n";
import { LianeDetailedMatchView } from "@/components/trip/LianeMatchView";
import { BottomOptionBg } from "@/components/vectors/BottomOptionBg";
import { AppButton } from "@/components/base/AppButton";
import { formatDuration } from "@/util/datetime";
import { useAppNavigation } from "@/api/navigation";
import { toJoinLianeRequest } from "@/screens/search/SearchFormData";
import { TripChangeOverview } from "@/components/map/TripOverviewMap";

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

export const LianeMatchDetailScreen = () => {
  const { route, navigation } = useAppNavigation<"LianeMatchDetail">();
  const liane: LianeMatch = route.params!.lianeMatch;
  const insets = useSafeAreaInsets();
  const isExactMatch = liane.match.type === "Exact";
  const filter = route.params!.filter;

  const formattedDepartureTime = formatDateTime(new Date(liane.liane.departureTime));
  const formattedSeatCount = formatSeatCount(liane.freeSeatsCount);
  const matchLabel = isExactMatch ? "Trajet exact" : "Trajet compatible";
  const driverLabel = liane.liane.driver ? "John Doe" : "Aucun conducteur";

  return (
    <View style={styles.page}>
      <Row style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <Pressable style={{ paddingVertical: 8, paddingHorizontal: 16 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} size={24} color={defaultTextColor(AppColors.yellow)} />
        </Pressable>
        <AppText style={styles.title}>Détails de la Liane</AppText>
      </Row>
      <View style={styles.section}>
        <LianeDetailedMatchView
          from={filter.from}
          to={filter.to}
          departureTime={liane.liane.departureTime}
          originalTrip={liane.liane.wayPoints}
          newTrip={liane.wayPoints}
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
        <TripChangeOverview params={{ liane: liane.liane, newWayPoints: liane.wayPoints }} />
        {isExactMatch && (
          <Row spacing={8} style={[styles.tag, isExactMatch ? styles.exactMatchBg : styles.compatibleMatchBg]}>
            {isExactMatch ? <AppIcon name={"arrow-upward-outline"} /> : <AppCustomIcon name={"twisting-arrow"} size={20} />}
            <AppText style={{ fontSize: 16 }}>{matchLabel}</AppText>
          </Row>
        )}
        {!isExactMatch && (
          <AppText>Ce trajet fait faire un détour de {formatDuration((liane.match as Compatible).deltaInSeconds)} à John Doe</AppText>
        )}
      </Column>
      <View style={styles.separator} />
      <Row style={[styles.section, { alignItems: "center" }]} spacing={16}>
        <View
          style={{
            backgroundColor: liane.liane.driver ? ContextualColors.greenValid.bg : ContextualColors.redAlert.bg,
            padding: 12,
            borderRadius: 52
          }}>
          <AppCustomIcon name={liane.liane.driver ? "car-check-mark" : "car-strike-through"} size={36} />
        </View>
        <AppText style={{ fontSize: 18 }}>{driverLabel} </AppText>
      </Row>
      <View style={styles.separator} />

      <BottomOptionBg color={AppColors.darkBlue}>
        <AppButton
          icon={"arrow-right"}
          title={"Rejoindre"}
          onPress={() => navigation.navigate({ name: "RequestJoin", params: { request: toJoinLianeRequest(filter, liane, "") }, key: "req" })}
        />
      </BottomOptionBg>
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
