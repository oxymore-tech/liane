import { Center, Column, Row } from "@/components/base/AppLayout";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { getPoint, getTotalDuration, getTrip, LianeMatch, LianeMember, UserTrip, UTCDateTime, WayPoint } from "@liane/common";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { TripSegmentView } from "@/components/trip/TripSegmentView";
import { AppText } from "@/components/base/AppText";
import { filterHasFullTrip, HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import { TimeView } from "@/components/TimeView";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { useAppNavigation } from "@/components/context/routing";
import { AppIcon } from "@/components/base/AppIcon";
import { AppBottomSheetFlatList } from "@/components/base/AppBottomSheet";
import { AppTabs } from "@/components/base/AppTabs";
import { UserPicture } from "@/components/UserPicture";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/context/ContextProvider";
import { AppStyles } from "@/theme/styles";
import { AppLocalization } from "@/api/i18n";

const EmptyResultView = (props: { message: string }) => (
  <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "center" }]}>{props.message}</AppText>
);
const ErrorView = (props: { message: string; retry: () => void }) => (
  <Column style={{ alignItems: "center" }} spacing={8}>
    <AppText>{props.message}</AppText>
    <AppButton color={AppColors.primaryColor} title={"Réessayer"} icon={"refresh-outline"} onPress={props.retry} />
  </Column>
);

export const LianeMatchItemView = ({
  from,
  to,
  freeSeatsCount,
  returnTime,
  duration,
  userIsMember = false
}: {
  duration: string;
  from: WayPoint;
  to: WayPoint;
  returnTime?: UTCDateTime | undefined;
  freeSeatsCount: number;
  userIsMember?: boolean;
}) => {
  return (
    <Column>
      <TripSegmentView from={from.rallyingPoint} to={to.rallyingPoint} departureTime={from.eta} arrivalTime={to.eta} />

      {userIsMember && (
        <Center>
          <AppText>Vous êtes déjà membre de cette Liane.</AppText>
        </Center>
      )}

      {!userIsMember && (
        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
          <Column>
            <Row style={{ position: "relative", left: -4, alignItems: "center" }}>
              {!returnTime && (
                <Row style={[AppStyles.center, { paddingTop: 8 }]}>
                  <AppIcon name={returnTime ? "corner-down-right-outline" : "arrow-forward"} color={AppColorPalettes.gray[500]} size={15} />
                  <AppText style={styles.infoTravel}>Aller simple</AppText>
                </Row>
              )}
              {!!returnTime && (
                <Row>
                  <AppIcon name={returnTime ? "corner-down-right-outline" : "arrow-forward"} color={AppColorPalettes.gray[500]} size={15} />
                  <AppText>{"Retour à "}</AppText>
                  <TimeView style={{ fontWeight: "bold" }} value={returnTime} />
                </Row>
              )}
            </Row>
          </Column>

          <Row style={{ alignItems: "flex-end", paddingTop: 8 }}>
            <Row style={{ alignItems: "center", marginRight: 16 }}>
              <AppText style={styles.infoTravel}>{freeSeatsCount}</AppText>
              <AppIcon name={"seat"} color={AppColorPalettes.gray[500]} />
            </Row>
            <Row style={{ alignItems: "center", paddingBottom: 1 }}>
              <AppText style={styles.infoTravel}>5€</AppText>
            </Row>
          </Row>
        </Row>
      )}
    </Column>
  );
};

export const LianeMatchListView = ({ loading = false }: { loading?: boolean }) => {
  const machine = useContext(HomeMapContext);
  const { user } = useContext(AppContext);
  const [state] = useActor(machine);
  const displayedLianes = state.context.matches ?? [];
  const { navigation } = useAppNavigation();
  const [showCompatible, setShowCompatible] = useState(false);
  const formattedData = useMemo(() => {
    const matches = (state.context.matches ?? []).map(item => {
      const wayPoints = item.match.type === "Exact" ? item.trip.wayPoints : item.match.wayPoints;
      const fromPoint = getPoint(item, "pickup");
      const toPoint = getPoint(item, "deposit");
      const trip = getTrip(item.trip.departureTime, wayPoints, toPoint.id, fromPoint.id);
      const tripDuration = getTotalDuration(trip.wayPoints);
      return {
        lianeMatch: item,
        lianeIsExactMatch: item.match.type === "Exact",
        wayPoints,
        fromPoint,
        toPoint,
        trip,
        tripDuration,
        returnTime: item.returnTime
      };
    });
    const exact = matches.filter(i => {
      return i.fromPoint.id === state.context.filter.from!.id && i.toPoint.id === state.context.filter.to!.id;
    });
    const compatible = matches.filter(i => {
      const isResearched = i.fromPoint.id === state.context.filter.from!.id && i.toPoint.id === state.context.filter.to!.id;
      return !isResearched;
    });
    return [exact, compatible];
    //@ts-ignore
  }, [state.context.filter.from?.id, state.context.filter.to?.id, JSON.stringify(state.context.matches)]);

  const data = useMemo(() => {
    return showCompatible ? formattedData[1] : formattedData[0];
  }, [showCompatible, JSON.stringify(formattedData)]);
  useEffect(() => {
    const d = showCompatible ? formattedData[1] : formattedData[0];
    machine.send("DISPLAY", { data: d.map(item => item.lianeMatch.trip.id) });
  }, [showCompatible, JSON.stringify(formattedData)]);

  if (state.matches({ match: "failed" })) {
    return (
      <ErrorView
        message={"Erreur lors de la requête"}
        retry={() => {
          machine.send("RELOAD");
        }}
      />
    );
  }

  if (loading || (state.matches("match") && !state.context.matches)) {
    return <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />;
  }
  if (loading || !state.matches("match") || !state.context.matches) {
    return null;
  }

  const renderItem = ({ item }: { item: { lianeMatch: LianeMatch; trip: UserTrip; returnTime: UTCDateTime } }) => {
    const driver = item.lianeMatch.trip.members.find((l: LianeMember) => l.user.id === item.lianeMatch.trip.driver.user)!.user;
    const duration = AppLocalization.formatDuration(getTotalDuration(item.trip.wayPoints.slice(1)));
    const userIsMember = !!item.lianeMatch.trip.members.find(m => m.user.id === user!.id);
    return (
      <Column>
        <View style={{ margin: 12 }}>
          <AppPressableOverlay
            foregroundColor={WithAlpha(AppColors.black, 0.05)}
            style={styles.itemStyle}
            backgroundStyle={styles.itemBackgroundStyle}
            onPress={() => {
              if (userIsMember) {
                navigation.navigate("LianeDetail", { liane: item.lianeMatch.trip });
              } else {
                machine.send("DETAIL", { data: item.lianeMatch });
              }
            }}>
            <Row style={{ alignItems: "center", marginBottom: 8 }} spacing={8}>
              <UserPicture url={driver.pictureUrl} size={38} id={driver.id} />
              <AppText style={{ fontSize: 16, fontWeight: "500" }}>{driver.pseudo}</AppText>
            </Row>
            <View style={{ paddingHorizontal: 8 }}>
              <LianeMatchItemView
                duration={duration}
                from={item.trip.wayPoints[0]}
                to={item.trip.wayPoints[item.trip.wayPoints.length - 1]}
                freeSeatsCount={item.lianeMatch.freeSeatsCount}
                returnTime={item.returnTime}
                userIsMember={userIsMember}
              />
            </View>
          </AppPressableOverlay>
        </View>
      </Column>
    );
  };

  const exactResultsCount = showCompatible ? displayedLianes.length - data.length : data.length;
  return (
    <View style={{ flex: 1 }}>
      <Column style={styles.headerListStyle}>
        <AppTabs
          items={["Résultats (" + exactResultsCount + ")", "Trajets alternatifs (" + (displayedLianes.length - exactResultsCount) + ")"]}
          onSelect={i => {
            const showCompat = i === 1;
            setShowCompatible(showCompat);
          }}
          selectedIndex={showCompatible ? 1 : 0}
          isSelectable={index => index !== 1 || displayedLianes.length - exactResultsCount !== 0}
          unselectedTextColor={displayedLianes.length - exactResultsCount === 0 ? AppColorPalettes.gray[500] : undefined}
        />
      </Column>
      {data.length === 0 && <EmptyResultView message={"Aucun trajet ne correspond à votre recherche."} />}
      {data.length === 0 && (
        <Center style={{ paddingVertical: 8 }}>
          <AppRoundedButton
            backgroundColor={AppColors.primaryColor}
            text={"Ajouter une annonce"}
            onPress={() => {
              navigation.navigate("Publish", {
                initialValue: filterHasFullTrip(state.context.filter)
                  ? { wayPoints: [state.context.filter.from!, state.context.filter.to!] }
                  : undefined
              });
            }}
          />
        </Center>
      )}

      <AppBottomSheetFlatList data={data} keyExtractor={i => i.lianeMatch.trip.id!} renderItem={renderItem} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerListStyle: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: AppColors.lightGrayBackground,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColorPalettes.gray[200]
  },
  itemBackgroundStyle: {
    backgroundColor: AppColors.white,
    borderRadius: 20
  },
  itemStyle: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16
  },
  infoTravel: {
    fontSize: 16,
    marginLeft: 6,
    color: AppColorPalettes.gray[500]
  }
});
