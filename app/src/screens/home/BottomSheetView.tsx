import { Center, Column, Row } from "@/components/base/AppLayout";
import React, { useContext, useMemo } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { Exact, getPoint, Liane, LianeMatch, RallyingPoint, RallyingPointLink, UnionUtils } from "@/api";
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
import { getCenter } from "@/api/geo";

import { capitalize } from "@/util/strings";

export const FilterListView = ({ loading = false }: { loading?: boolean }) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);

  console.log("state dbg", state.context.matches);
  return (
    <Column style={{ flex: 1 }} spacing={8}>
      {/*["map", "point", "match"].some(state.matches) && <FilterSelector />*/}
      {(loading || (state.matches("match") && !state.context.matches)) && <ActivityIndicator />}
      {!loading && state.matches("match") && state.context.matches && (
        <LianeMatchListView
          onSelect={l => machine.send("DETAIL", { data: l })}
          lianeList={state.context.matches}
          filter={filterHasFullTrip(state.context.filter) ? { to: state.context.filter.to!, from: state.context.filter.from! } : undefined}
        />
      )}
      {/*!filterVisible && state.matches("point") && (
        <LianeDestinations pickup={state.context.filter.from!} date={state.context.filter.targetTime?.dateTime} />
      )*/}
    </Column>
  );
};

//TODO
const EmptyResultView = (props: { message: string }) => (
  <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "center" }]}>{props.message}</AppText>
);
const ErrorView = (props: { message: string }) => (
  <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "center", color: "red" }]}>{props.message}</AppText>
);

/*
{"mairie:65382": {"hours": ["2023-04-15T07:30:37.276Z"], "pickup": {"address": "Le Village", "city": "Sacoué", "id": "mairie:65382", "isActive": true, "label": "Mairie de Sacoué", "location": [Object], "placeCount": null, "type": "TownHall", "zipCode": "65370"}}}
 */

export const LianeNearestLinks = () => {
  const { services } = useContext(AppContext);
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const { navigation } = useAppNavigation();

  const mapCenter = state.context.mapDisplay.displayBounds ? getCenter(state.context.mapDisplay.displayBounds) : undefined;
  console.log(["getClosestRP", mapCenter, state.context.filter.availableSeats, state.context.filter.targetTime?.dateTime.toISOString()]);
  const closestRallyingPointQuery = useQuery(["getClosestRP", mapCenter], () => services.rallyingPoint.snap(mapCenter!), {
    enabled: !!mapCenter
  });

  const nearestLinksQuery = useQuery(
    [
      "getNearestLinks",
      closestRallyingPointQuery.data?.id,
      // TODO ? :  state.context.filter.availableSeats,
      state.context.filter.targetTime?.dateTime.toISOString()
    ],
    () => services.liane.nearestLinks(closestRallyingPointQuery.data!.location, 10000, state.context.filter.targetTime?.dateTime),
    {
      enabled: !!closestRallyingPointQuery.data
    }
  );
  const sectionData = useMemo(
    () => (nearestLinksQuery?.data || []).slice(0, Math.min(10, nearestLinksQuery.data?.length || 0)),
    [nearestLinksQuery?.data]
  );

  if (!nearestLinksQuery.data) {
    return <ActivityIndicator />;
  }

  const renderItem = ({ item: section }) => {
    if (!section.pickup) {
      console.warn("undefined pickup:", section);
    }
    return (
      <Column key={section.pickup.id!} style={{ marginBottom: 16 }}>
        <Row style={{ justifyContent: "flex-start", paddingHorizontal: 16, flex: 1 }}>
          <View style={{ backgroundColor: AppColorPalettes.orange[500], borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 }}>
            <AppText style={{ color: AppColors.white, fontWeight: "bold", flexShrink: 1 }}>{section.pickup.label}</AppText>
          </View>
        </Row>
        {section.destinations.map(item => {
          return (
            <LianeDestinationView
              key={item.deposit.id!}
              onPress={() => {
                machine.send([{ type: "UPDATE", data: { from: section.pickup, to: item.deposit } }, { type: "FORM" }]);
              }}
              item={item}
            />
          );
        })}
      </Column>
    );
  };
  console.log("n", nearestLinksQuery.data?.length);
  if (nearestLinksQuery.data.length === 0) {
    return (
      <Column>
        <EmptyResultView message={"Aucun trajet dans cette zone."} />
        {
          <Center style={{ paddingVertical: 8 }}>
            <AppRoundedButton
              backgroundColor={AppColors.orange}
              text={"Proposer un trajet"}
              onPress={() => {
                navigation.navigate("Publish", {});
              }}
            />
          </Center>
        }
      </Column>
    );
  }
  return (
    /* <AppBottomSheetSectionList
      stickySectionHeadersEnabled={false}
      sections={sectionData}
      renderSectionHeader={renderSectionHeader}
      renderItem={renderItem}
      renderSectionFooter={() => <View style={{ height: 16 }} />}
    />*/
    <AppBottomSheetFlatList data={sectionData} renderItem={renderItem} />
  );

  /*
  return (
    <Column spacing={8} style={{ flex: 1 }}>
      {nearestLinksQuery.data.length === 0 && <EmptyResultView />}
      <SectionList
        keyExtractor={(i, index) => [i.deposit.id!, index].join(" ")}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={() => {
          return <View style={{ height: 16 }} />;
        }}
        renderItem={renderItem}
        sections={sectionData}
      />
    </Column>
  );*/
};
export const LianeDestinations = (props: { pickup: RallyingPoint; date: Date | undefined }) => {
  const { services } = useContext(AppContext);
  const machine = useContext(HomeMapContext);
  const { navigation } = useAppNavigation();

  const {
    data: results,
    isLoading,
    error
  } = useQuery(["getNearestLinks", props.pickup.id, props.date?.toISOString()], async () => {
    const res = await services.liane.nearestLinks(props.pickup.location, 100, props.date);
    console.log("res", res, props.pickup.location);
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
          {props.item.hours.map(h => (
            <TimeView key={h} style={TripViewStyles.mainWayPointTime} value={h} />
          ))}
        </Row>
      </Column>
    </AppPressableOverlay>
  );
};

export const LianeMatchListView = (props: { lianeList: LianeMatch[] | undefined; filter: any; onSelect: (l: LianeMatch) => void }) => {
  const displayedLianes = props.lianeList ?? [];
  const { navigation } = useAppNavigation();
  const data = useMemo(
    () =>
      (props.lianeList ?? []).map(item => {
        const lianeIsExactMatch = UnionUtils.isInstanceOf<Exact>(item.match, "Exact");
        const wayPoints = lianeIsExactMatch ? item.liane.wayPoints : item.match.wayPoints;
        const fromPoint = getPoint(item, "pickup");
        const toPoint = getPoint(item, "deposit");
        const trip = getTrip(item.liane.departureTime, wayPoints, toPoint.id, fromPoint.id);
        const tripDuration = getTotalDuration(trip.wayPoints);
        return { lianeMatch: item, lianeIsExactMatch, wayPoints, fromPoint, toPoint, trip, tripDuration };
      }),
    [props.lianeList]
  );
  const renderItem = ({ item }) => {
    return (
      <AppPressableOverlay
        foregroundColor={WithAlpha(AppColors.black, 0.1)}
        style={{ paddingHorizontal: 24, paddingVertical: 8 }}
        onPress={() => {
          props.onSelect(item.lianeMatch);
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
  return (
    <Column spacing={8}>
      {displayedLianes.length > 0 && (
        <AppText style={{ paddingHorizontal: 24, fontWeight: "bold" }}>
          {displayedLianes.length} résultat{displayedLianes.length > 1 ? "s" : ""}
        </AppText>
      )}
      {displayedLianes.length === 0 && <EmptyResultView message={"Aucun trajet ne correspond à votre recherche."} />}
      {displayedLianes.length === 0 && (
        <Center style={{ paddingVertical: 8 }}>
          <AppRoundedButton
            backgroundColor={AppColors.orange}
            text={"Ajouter une annonce"}
            onPress={() => {
              navigation.navigate("Publish", { initialValue: props.filter });
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

/*
export const LianeListView = (props: { lianeList: Liane[] | undefined }) => {
  const displayedLianes = props.lianeList ?? [];
  const { send } = useContext(HomeMapContext);
  return (
    <Column spacing={8}>
      {displayedLianes.length > 0 && (
        <AppText style={{ paddingHorizontal: 24, fontWeight: "bold" }}>
          {displayedLianes.length} résultat{displayedLianes.length > 1 ? "s" : ""}
        </AppText>
      )}
      {displayedLianes.length === 0 && <EmptyResultView />}
      <FlatList
        data={displayedLianes}
        keyExtractor={i => i.id!}
        renderItem={({ item }) =>
          renderLianeOverview(item, args => {
            send("DETAIL", { data: args });
            //navigation.navigate("LianeMatchDetail", y);
          })
        }
      />
    </Column>
  );
};
*/
const renderLianeOverview = (liane: Liane, onSelect: (lianeMatch: LianeMatch) => void) => {
  const freeSeatsCount = liane.members.map(l => l.seatCount).reduce((acc, c) => acc + c, 0);

  return (
    <AppPressableOverlay
      foregroundColor={WithAlpha(AppColors.black, 0.1)}
      style={{ paddingHorizontal: 24, paddingVertical: 8 }}
      onPress={() => {
        onSelect({
          liane,
          match: {
            type: "Exact",
            pickup: liane.wayPoints[0].rallyingPoint.id!,
            deposit: liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint.id!
          },
          freeSeatsCount
        }); // TODO freeseat = -1 ?
      }}>
      <TripSegmentView
        departureTime={liane.departureTime}
        arrivalTime={liane.wayPoints[liane.wayPoints.length - 1].eta}
        duration={getTotalDuration(liane.wayPoints)}
        from={liane.wayPoints[0].rallyingPoint}
        to={liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint}
        freeSeatsCount={freeSeatsCount}
      />
    </AppPressableOverlay>
  );
};

export interface FilterSelectorProps {
  formatter?: (d: Date) => string;

  shortFormat?: boolean;
}

const selectAvailableSeats = state => state.context.filter.availableSeats;
const selectTargetTime = state => state.context.filter.targetTime;
export const FilterSelector = ({ formatter, shortFormat = false }: FilterSelectorProps) => {
  const machine = useContext(HomeMapContext);

  const availableSeats = useSelector(machine, selectAvailableSeats);
  const targetTime = useSelector(machine, selectTargetTime);

  const driver = availableSeats > 0;
  const date = targetTime?.dateTime || new Date();

  const defaultFormatter = shortFormat
    ? (d: Date) => capitalize(toRelativeDateString(d, formatShortMonthDay))
    : (d: Date) => {
        return targetTime?.direction === "Arrival" ? "Arrivée " : "Départ " + toRelativeDateString(d, formatShortMonthDay);
      };

  return (
    <Row style={{ justifyContent: "center", alignItems: "center", alignSelf: "center", flex: 1 }}>
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
          machine.send("FILTER", { data: { targetTime: { ...targetTime, dateTime: d } } });
        }}
        formatter={formatter || defaultFormatter}
      />
    </Row>
  );
};
