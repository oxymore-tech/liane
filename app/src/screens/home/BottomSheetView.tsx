import { Center, Column, Row } from "@/components/base/AppLayout";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { Exact, getPoint, LianeMember, UnionUtils, UTCDateTime, WayPoint } from "@/api";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { TripSegmentView, TripViewStyles } from "@/components/trip/TripSegmentView";
import { getTotalDuration, getTrip } from "@/components/trip/trip";
import { AppText } from "@/components/base/AppText";
import { filterHasFullTrip, HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";

import { TimeView } from "@/components/TimeView";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { useAppNavigation } from "@/api/navigation";

import { AppIcon } from "@/components/base/AppIcon";

import { AppBottomSheetFlatList } from "@/components/base/AppBottomSheet";
import { AppTabs } from "@/components/base/AppTabs";
import { SectionSeparator } from "@/components/Separator";
import { UserPicture } from "@/components/UserPicture";
import { formatDuration } from "@/util/datetime";

const EmptyResultView = (props: { message: string }) => (
  <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "center" }]}>{props.message}</AppText>
);
const ErrorView = (props: { message: string }) => (
  <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "center", color: "red" }]}>{props.message}</AppText>
);

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
export const LianeMatchItemView = ({
  from,
  to,
  freeSeatsCount,
  returnTime,
  duration
}: {
  duration: string;
  from: WayPoint;
  to: WayPoint;
  returnTime?: UTCDateTime | undefined;
  freeSeatsCount: number;
}) => {
  return (
    <Column>
      <TripSegmentView from={from.rallyingPoint} to={to.rallyingPoint} departureTime={from.eta} arrivalTime={to.eta} />
      <View
        style={[
          TripViewStyles.horizontalLine,
          { alignSelf: "flex-start", width: "100%", borderColor: AppColorPalettes.gray[200], marginTop: 12, marginBottom: 8 }
        ]}
      />
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Column>
          <Row spacing={2} style={{ position: "relative", left: -4, alignItems: "center" }}>
            <AppIcon name={"clock-outline"} color={AppColorPalettes.gray[500]} size={18} />
            <AppText>{duration}</AppText>
          </Row>
          <Row style={{ position: "relative", left: -4, alignItems: "center" }}>
            <AppIcon name={returnTime ? "corner-down-right-outline" : "arrow-forward"} color={AppColorPalettes.gray[500]} size={15} />

            {!returnTime && <AppText>Aller simple</AppText>}
            {!!returnTime && (
              <Row>
                <AppText>{"Retour à "}</AppText>
                <TimeView style={{ fontWeight: "bold" }} value={returnTime} />
              </Row>
            )}
          </Row>
        </Column>
        <Column style={{ alignItems: "flex-end" }}>
          <Row style={{ alignItems: "center" }}>
            <AppText style={{ fontWeight: "bold", fontSize: 16 }}>5€ / </AppText>
            <AppIcon name={"person-outline"} size={18} />
          </Row>
          <Row style={{ alignItems: "center" }}>
            <AppText style={{ fontWeight: "bold", fontSize: 16 }}>{freeSeatsCount}</AppText>
            <AppIcon name={"seat"} />
          </Row>
        </Column>
      </Row>
    </Column>
  );
};

export const LianeMatchListView = ({ loading = false }: { loading?: boolean }) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const displayedLianes = state.context.matches ?? [];
  const { navigation } = useAppNavigation();
  const [showCompatible, setShowCompatible] = useState(false);
  const formattedData = useMemo(() => {
    const matches = (state.context.matches ?? []).map(item => {
      const lianeIsExactMatch = UnionUtils.isInstanceOf<Exact>(item.match, "Exact");
      const wayPoints = lianeIsExactMatch ? item.liane.wayPoints : item.match.wayPoints;
      const fromPoint = getPoint(item, "pickup");
      const toPoint = getPoint(item, "deposit");
      const trip = getTrip(item.liane.departureTime, wayPoints, toPoint.id, fromPoint.id);
      const tripDuration = getTotalDuration(trip.wayPoints);
      return { lianeMatch: item, lianeIsExactMatch, wayPoints, fromPoint, toPoint, trip, tripDuration, returnTime: item.liane.returnTime };
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
    const d = showCompatible ? formattedData[1] : formattedData[0];

    return d;
  }, [showCompatible, JSON.stringify(formattedData)]);
  useEffect(() => {
    const d = showCompatible ? formattedData[1] : formattedData[0];
    machine.send("DISPLAY", { data: d.map(item => item.lianeMatch.liane.id) });
  }, [showCompatible, JSON.stringify(formattedData)]);

  if (loading || (state.matches("match") && !state.context.matches)) {
    return <ActivityIndicator />;
  }
  if (loading || !state.matches("match") || !state.context.matches) {
    return null;
  }

  const renderItem = ({ item }: { item: any }) => {
    const driver = item.lianeMatch.liane.members.find((l: LianeMember) => l.user.id === item.lianeMatch.liane.driver.user)!.user;
    const duration = formatDuration(getTotalDuration(item.trip.wayPoints.slice(1)));
    return (
      <Column>
        <AppPressableOverlay
          foregroundColor={WithAlpha(AppColors.black, 0.1)}
          style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}
          onPress={() => {
            machine.send("DETAIL", { data: item.lianeMatch });
          }}>
          <Row style={{ alignItems: "center", marginBottom: 8 }} spacing={8}>
            <UserPicture url={undefined} size={24} id={driver.id} />
            <AppText style={{ fontSize: 14, fontWeight: "500" }}>{driver.pseudo}</AppText>
          </Row>
          <View style={{ paddingHorizontal: 8 }}>
            <LianeMatchItemView
              duration={duration}
              from={item.trip.wayPoints[0]}
              to={item.trip.wayPoints[item.trip.wayPoints.length - 1]}
              freeSeatsCount={item.lianeMatch.freeSeatsCount}
              returnTime={item.returnTime}
            />
          </View>
        </AppPressableOverlay>
        <SectionSeparator style={{ marginVertical: 0 }} />
      </Column>
    );
  };
  const exactResultsCount = showCompatible ? displayedLianes.length - data.length : data.length;
  return (
    <Column spacing={8}>
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
      {data.length === 0 && <EmptyResultView message={"Aucun trajet ne correspond à votre recherche."} />}
      {data.length === 0 && (
        <Center style={{ paddingVertical: 8 }}>
          <AppRoundedButton
            backgroundColor={AppColors.orange}
            text={"Ajouter une annonce"}
            onPress={() => {
              navigation.navigate("Publish", {
                initialValue: filterHasFullTrip(state.context.filter) ? { to: state.context.filter.to!, from: state.context.filter.from! } : undefined
              });
            }}
          />
        </Center>
      )}
      <AppBottomSheetFlatList
        /* onScroll={event => {
          console.debug(JSON.stringify(event.nativeEvent));
        }}
        onScrollEndDrag={event => {
          console.debug(JSON.stringify(event.nativeEvent));
        }}*/
        data={data}
        keyExtractor={i => i.lianeMatch.liane.id!}
        renderItem={renderItem}
      />
    </Column>
  );
};
