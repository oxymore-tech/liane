import { Center, Column, Row } from "@/components/base/AppLayout";
import React, { useContext, useMemo, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { Exact, getPoint, RallyingPoint, RallyingPointLink, UnionUtils } from "@/api";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { TripSegmentView, TripViewStyles } from "@/components/trip/TripSegmentView";
import { getTotalDuration, getTrip } from "@/components/trip/trip";
import { AppText } from "@/components/base/AppText";
import { filterHasFullTrip, HomeMapContext } from "@/screens/home/StateMachine";
import { useActor, useSelector } from "@xstate/react";
import { AppContext } from "@/components/ContextProvider";
import { TimeView } from "@/components/TimeView";
import { DatePagerSelector } from "@/components/DatePagerSelector";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { useAppNavigation } from "@/api/navigation";

import { AppIcon } from "@/components/base/AppIcon";
import { formatShortMonthDay, toRelativeDateString } from "@/api/i18n";

import { AppBottomSheetFlatList } from "@/components/base/AppBottomSheet";
import { useQuery } from "react-query";

import { capitalize } from "@/util/strings";
import { Observable } from "rxjs";
import { Feature } from "geojson";
import { useObservable } from "@/util/hooks/subscription";
import { AppTabs } from "@/components/base/AppTabs";

const EmptyResultView = (props: { message: string }) => (
  <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "center" }]}>{props.message}</AppText>
);
const ErrorView = (props: { message: string }) => (
  <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "center", color: "red" }]}>{props.message}</AppText>
);

export const LianeDestinations = (props: {
  pickup: RallyingPoint;
  date: Date | undefined;
  mapFeatureObservable: Observable<Feature[] | undefined>;
}) => {
  const { services } = useContext(AppContext);
  const machine = useContext(HomeMapContext);
  const { navigation } = useAppNavigation();

  const features = useObservable(props.mapFeatureObservable, undefined);

  const viewportLianes = features ? [...new Set<string>(features.map(f => f.properties!.id))] : undefined;
  const {
    data: results,
    isLoading,
    error
  } = useQuery(["getNearestLinks", props.pickup.id, props.date?.toISOString(), viewportLianes?.sort().join(",")], async () => {
    if (!viewportLianes) {
      return undefined;
    }

    const res = await services.liane.pickupLinks(props.pickup.id!, viewportLianes);

    const index = res.findIndex(p => p.pickup.id === props.pickup.id);
    if (index < 0) {
      return [];
    }
    return res[index].destinations;
  });

  if (error) {
    return <ErrorView message={error.message} />;
  }
  if (isLoading || !results) {
    return <ActivityIndicator />;
  }

  return (
    <Column spacing={8}>
      {results.length === 0 && <EmptyResultView message={"Aucun trajet."} />}
      {results.length === 0 && (
        <Center style={{ paddingVertical: 8 }}>
          <AppRoundedButton
            backgroundColor={AppColors.orange}
            text={"Ajouter une annonce"}
            onPress={() => {
              navigation.navigate("Publish", { initialValue: { from: props.pickup } });
            }}
          />
        </Center>
      )}
      <AppBottomSheetFlatList
        data={results}
        keyExtractor={i => i.deposit.id!}
        renderItem={({ item }) => {
          return (
            <LianeDestinationView
              onPress={() => {
                machine.send("UPDATE", { data: { from: props.pickup, to: item.deposit } });
              }}
              item={item}
            />
          );
        }}
      />
    </Column>
  );
};

const LianeDestinationView = (props: { onPress: () => void; item: RallyingPointLink }) => {
  if (!props.item.deposit) {
    console.warn("Empty deposit:", props.item);
    return <View />;
  }
  return (
    <AppPressableOverlay
      foregroundColor={WithAlpha(AppColors.black, 0.1)}
      style={{ paddingHorizontal: 24, paddingVertical: 8 }}
      onPress={props.onPress}>
      <Column spacing={4}>
        <Row style={{ alignItems: "center" }} spacing={4}>
          <AppIcon name={"pin"} color={AppColors.orange} size={18} />
          <View
            style={{
              borderColor: AppColorPalettes.gray[400],
              borderTopWidth: 1,
              position: "absolute",
              flex: 1,
              left: 28,
              width: 32
            }}
          />
          <View style={{ width: 16 }} />
          <AppIcon name={"arrow-right"} color={AppColorPalettes.gray[400]} />

          <View style={{ justifyContent: "center" }}>
            <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.toLabel, { maxWidth: "100%" }]}>{props.item.deposit.city}</AppText>
          </View>
        </Row>
        <Row
          style={{
            justifyContent: "flex-start",
            paddingLeft: 16,
            marginLeft: 8,
            borderLeftWidth: 2,
            borderLeftColor: Platform.OS === "ios" ? AppColorPalettes.gray[400] : AppColors.orange,
            borderStyle: Platform.OS === "ios" ? undefined : "dotted"
          }}>
          <AppText style={TripViewStyles.mainWayPointTime}>Départ à </AppText>
          {props.item.hours.flatMap((h, index, array) => {
            const time = <TimeView key={h} style={TripViewStyles.mainWayPointTime} value={h} />;
            return array.length - 1 !== index ? [time, <AppText style={TripViewStyles.mainWayPointTime}>, </AppText>] : time;
          })}
        </Row>
      </Column>
    </AppPressableOverlay>
  );
};

export const LianeMatchListView = ({ loading = false }: { loading?: boolean }) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const displayedLianes = state.context.matches ?? [];
  const { navigation } = useAppNavigation();
  const [showCompatible, setShowCompatible] = useState(false);
  const data = useMemo(
    () =>
      (state.context.matches ?? [])
        .map(item => {
          const lianeIsExactMatch = UnionUtils.isInstanceOf<Exact>(item.match, "Exact");
          const wayPoints = lianeIsExactMatch ? item.liane.wayPoints : item.match.wayPoints;
          const fromPoint = getPoint(item, "pickup");
          const toPoint = getPoint(item, "deposit");
          const trip = getTrip(item.liane.departureTime, wayPoints, toPoint.id, fromPoint.id);
          const tripDuration = getTotalDuration(trip.wayPoints);
          return { lianeMatch: item, lianeIsExactMatch, wayPoints, fromPoint, toPoint, trip, tripDuration };
        })
        .filter(i => {
          const isResearched = i.fromPoint.id === state.context.filter.from!.id && i.toPoint.id === state.context.filter.to!.id;
          return showCompatible ? !isResearched : isResearched;
        }),
    [state.context.matches, showCompatible]
  );
  if (loading || (state.matches("match") && !state.context.matches)) {
    return <ActivityIndicator />;
  }
  if (loading || !state.matches("match") || !state.context.matches) {
    return null;
  }
  const renderItem = ({ item }) => {
    return (
      <AppPressableOverlay
        foregroundColor={WithAlpha(AppColors.black, 0.1)}
        style={{ paddingHorizontal: 24, paddingVertical: 8 }}
        onPress={() => {
          machine.send("DETAIL", { data: item.lianeMatch });
        }}>
        <TripSegmentView
          from={item.fromPoint}
          to={item.toPoint}
          departureTime={item.trip.departureTime}
          arrivalTime={item.trip.wayPoints[item.trip.wayPoints.length - 1].eta}
          duration={item.tripDuration}
          freeSeatsCount={item.lianeMatch.freeSeatsCount}
        />
      </AppPressableOverlay>
    );
  };
  const exactResultsCount = showCompatible ? displayedLianes.length - data.length : data.length;
  return (
    <Column spacing={8}>
      <AppTabs
        items={["Résultats (" + exactResultsCount + ")", "Trajets alternatifs (" + (displayedLianes.length - exactResultsCount) + ")"]}
        onSelect={i => setShowCompatible(i === 1)}
        selectedIndex={showCompatible ? 1 : 0}
        isSelectable={index => index !== 1 || displayedLianes.length - exactResultsCount !== 0}
        unselectedTextColor={AppColorPalettes.gray[500]}
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

export interface FilterSelectorProps {
  formatter?: (d: Date) => string;

  shortFormat?: boolean;
}

//const selectAvailableSeats = state => state.context.filter.availableSeats;
const selectTargetTime = state => state.context.filter.targetTime;
export const FilterSelector = ({ formatter, shortFormat = false }: FilterSelectorProps) => {
  const machine = useContext(HomeMapContext);

  // const availableSeats = useSelector(machine, selectAvailableSeats);
  const targetTime = useSelector(machine, selectTargetTime);

  //  const driver = availableSeats > 0;
  const date = targetTime?.dateTime || new Date();

  const defaultFormatter = shortFormat
    ? (d: Date) => capitalize(toRelativeDateString(d, formatShortMonthDay))
    : (d: Date) => {
        return targetTime?.direction === "Arrival" ? "Arrivée " : "Départ " + toRelativeDateString(d, formatShortMonthDay);
      };

  return (
    <Row style={{ justifyContent: "center", alignItems: "center", alignSelf: "center", flex: 1, paddingHorizontal: 8 }}>
      {/*<View style={{ paddingHorizontal: 16 }}>
        <SwitchIconToggle
          color={AppColors.blue}
          unselectedColor={AppColorPalettes.gray[200]}
          value={driver}
          onChange={() => {
            machine.send("FILTER", { data: { availableSeats: -availableSeats } });
          }}
          trueIcon={<AppIcon name={"car"} color={driver ? AppColors.white : undefined} size={22} />}
          falseIcon={<AppIcon name={"car-strike-through"} color={!driver ? AppColors.white : undefined} size={22} />}
        />
      </View>*/}
      <DatePagerSelector
        color={AppColors.white}
        date={date}
        onSelectDate={d => {
          machine.send("FILTER", { data: { targetTime: { ...targetTime, dateTime: new Date(d.toDateString()) } } });
        }}
        formatter={formatter || defaultFormatter}
      />
    </Row>
  );
};
