import { getPoint, isExactMatch, LianeMatch } from "@/api";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { formatDateTime } from "@/api/i18n";
import { LianeDetailedMatchView } from "@/components/trip/LianeMatchView";
import { BottomOptionBg } from "@/components/vectors/BottomOptionBg";
import { AppButton } from "@/components/base/AppButton";
import { useAppNavigation } from "@/api/navigation";
import { toJoinLianeRequest } from "@/screens/search/SearchFormData";
import { TripChangeOverview, TripOverview } from "@/components/map/TripOverviewMap";

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
  const lianeIsExactMatch = isExactMatch(liane.match);
  const filter = route.params!.filter;

  const formattedDepartureTime = formatDateTime(new Date(liane.liane.departureTime));
  const formattedSeatCount = formatSeatCount(liane.freeSeatsCount);
  const matchLabel = lianeIsExactMatch ? "Trajet exact" : "Trajet compatible";
  const driverLabel = liane.liane.driver.canDrive ? "John Doe" : "Aucun conducteur";
  const wayPoints = lianeIsExactMatch ? liane.liane.wayPoints : liane.match.wayPoints;

  const fromPoint = getPoint(liane, "pickup");
  const toPoint = getPoint(liane, "deposit");
  //console.log(JSON.stringify(liane));
  return (
    <View style={styles.page}>
      <Row style={[styles.footerContainer, { paddingTop: insets.top + 12 }]}>
        <Pressable style={{ paddingVertical: 8, paddingHorizontal: 16 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} size={24} color={defaultTextColor(AppColors.yellow)} />
        </Pressable>
        <AppText style={styles.title}>Détails de la Liane</AppText>
      </Row>
      <ScrollView>
        <View style={styles.section}>
          <LianeDetailedMatchView
            from={fromPoint}
            to={toPoint}
            departureTime={liane.liane.departureTime}
            originalTrip={liane.liane.wayPoints}
            newTrip={wayPoints}
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
          {lianeIsExactMatch && <TripOverview params={{ liane: liane.liane }} />}
          {!lianeIsExactMatch && (
            <TripChangeOverview
              params={{
                liane: liane.liane,
                newWayPoints: wayPoints.slice(
                  Math.max(
                    0,
                    wayPoints.findIndex(w => w.rallyingPoint.id === liane.match.pickup)
                  ),
                  Math.max(
                    wayPoints.length,
                    wayPoints.findIndex(w => w.rallyingPoint.id === liane.match.deposit)
                  )
                )
              }}
            />
          )}
          {lianeIsExactMatch && (
            <Row spacing={8} style={[styles.tag, lianeIsExactMatch ? styles.exactMatchBg : styles.compatibleMatchBg]}>
              {lianeIsExactMatch ? <AppIcon name={"arrow-upward-outline"} /> : <AppIcon name={"twisting-arrow"} size={20} />}
              <AppText style={{ fontSize: 16 }}>{matchLabel}</AppText>
            </Row>
          )}
        </Column>
        <View style={styles.separator} />
        <Row style={[styles.section, { alignItems: "center" }]} spacing={16}>
          <View
            style={{
              backgroundColor: liane.liane.driver.canDrive ? ContextualColors.greenValid.light : ContextualColors.redAlert.light,
              padding: 12,
              borderRadius: 52
            }}>
            <AppIcon name={liane.liane.driver.canDrive ? "car-check-mark" : "car-strike-through"} size={36} />
          </View>
          <AppText style={{ fontSize: 18 }}>{driverLabel} </AppText>
        </Row>
        <View style={[styles.separator, { marginBottom: 72 }]} />
      </ScrollView>
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
  },
  exactMatchBg: {
    backgroundColor: ContextualColors.greenValid.light
  },
  compatibleMatchBg: {
    backgroundColor: ContextualColors.orangeWarn.light
  }
});
