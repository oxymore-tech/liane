import { Center, Column, Row } from "@/components/base/AppLayout";
import React, { PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { getPoint, isExactMatch, Liane, LianeMatch, NearestLinks, RallyingPoint, RallyingPointLink, TargetTimeDirection } from "@/api";
import { AppPressable } from "@/components/base/AppPressable";
import { TripSegmentView, TripViewStyles } from "@/components/trip/TripSegmentView";
import { getTotalDuration, getTrip, getTripMatch } from "@/components/trip/trip";
import { AppText } from "@/components/base/AppText";
import { filterHasFullTrip, getSearchFilter, HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import { LianeDetailedMatchView } from "@/components/trip/LianeMatchView";
import { AppContext } from "@/components/ContextProvider";
import { TimeView } from "@/components/TimeView";
import { isToday, toTimeInSeconds } from "@/util/datetime";
import { DatePagerSelector } from "@/components/DatePagerSelector";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { toJoinLianeRequest, toLianeWizardFormData } from "@/screens/search/SearchFormData";
import { useAppNavigation } from "@/api/navigation";

import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { formatShortMonthDay } from "@/api/i18n";
import { SwitchToggle } from "@/components/forms/SelectToggleForm";
import DatePicker from "react-native-date-picker";
import {
  AppBottomSheet,
  AppBottomSheetFlatList,
  AppBottomSheetHandleHeight,
  AppBottomSheetScrollView,
  BottomSheetRefProps
} from "@/components/base/AppBottomSheet";
import { useBottomBarStyle } from "@/components/Navigation";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppDimensions } from "@/theme/dimensions";
import { useQuery } from "react-query";
import { getCenter } from "@/api/geo";
import { DetailedLianeMatchView } from "@/components/trip/WayPointsView";

export const HomeBottomSheetContainer = (
  props: {
    display?: "closed" | "full" | "none";
    canScroll?: boolean;
    onScrolled?: (y: number, isFull: boolean, isClosed: boolean) => void;
  } & PropsWithChildren
) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const isMapState = state.matches("map");
  const isMatchState = state.matches("match");
  const isPointState = state.matches("point");
  const { navigation } = useAppNavigation<"Home">();

  const bbStyle = useBottomBarStyle();
  React.useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: [...bbStyle, { display: isMapState ? undefined : "none" }] //{transform: [{translateY: state.matches("map") ? 0 : 80}]}]
    });
  });

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const h = useBottomTabBarHeight();
  const ref = useRef<BottomSheetRefProps>();

  useEffect(() => {
    if (props.display === "closed") {
      ref.current?.scrollTo(0);
    } else if (props.display === "full") {
      ref.current?.scrollTo(1);
    }
  }, [props.display]);

  //console.log(Platform.OS, h, insets, StatusBar.currentHeight, bottomSpace);

  if (props.display === "none") {
    return <View />;
  }

  const bottomSpace = insets.bottom + AppDimensions.bottomBar.marginVertical + h / 2;
  // (["point", "detail", "match"].some(state.matches) || (!movingDisplay && state.matches("map")));

  let stops: number[];
  let paddingTop: number;
  if (isMapState) {
    stops = [AppBottomSheetHandleHeight + h / 2 + 28, 0.3, 1];
    paddingTop = 96;
  } else if (isMatchState || isPointState) {
    stops = [AppBottomSheetHandleHeight + h / 2 + 52, 0.35, 1];
    paddingTop = 176;
  } else {
    stops = [0.35, 1];
    paddingTop = 40;
  }

  return (
    <AppBottomSheet
      ref={ref}
      stops={stops}
      onScrolled={v => {
        if (props.onScrolled) {
          props.onScrolled(v <= 1 ? height * v : v, v === stops[stops.length - 1], v === stops[0]);
        }
      }}
      canScroll={props.canScroll}
      padding={{ top: paddingTop + insets.top }}
      margins={{ right: isMapState ? 24 : 8, left: isMapState ? 24 : 8, bottom: isMapState ? bottomSpace : 0 }}>
      {props.children}
    </AppBottomSheet>
  );
};

export const TopRow = ({ loading = false, title }: { loading?: boolean; title: string }) => {
  return (
    <Row
      style={{
        borderBottomWidth: 1,
        borderColor: AppColorPalettes.gray[200],
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingBottom: 8,
        justifyContent: "space-between"
      }}>
      <AppText style={{ fontWeight: "bold", alignSelf: "center", color: AppColorPalettes.gray[600] }}>{title}</AppText>
      {loading && <ActivityIndicator size={12} color={"red"} />}
    </Row>
  );
};

export const FilterListView = ({ loading = false }: { loading?: boolean }) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const [filterVisible, setFilterVisible] = useState(false);

  console.log("state dbg", state.context.matches);
  return (
    <Column style={{ flex: 1 }} spacing={8}>
      {["map", "point", "match"].some(state.matches) && <FilterSelector onExtend={setFilterVisible} extended={filterVisible} />}
      {!filterVisible && (loading || (state.matches("match") && !state.context.matches)) && <ActivityIndicator />}
      {!filterVisible && !loading && state.matches("match") && state.context.matches && (
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
const EmptyResultView = () => <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "center" }]}>Aucun trajet.</AppText>;
const ErrorView = (props: { message: string }) => (
  <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "center", color: "red" }]}>{props.message}</AppText>
);

export const LianeMatchDetail = () => {
  const { navigation } = useAppNavigation();
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const liane = state.context.selectedMatch!;
  const lianeIsExactMatch = isExactMatch(liane.match);

  const fromPoint = getPoint(liane, "pickup");
  const toPoint = getPoint(liane, "deposit");
  const wayPoints = lianeIsExactMatch ? liane.liane.wayPoints : liane.match.wayPoints;

  const tripMatch = getTripMatch(toPoint, fromPoint, liane.liane.wayPoints, liane.liane.departureTime, wayPoints);

  //const formattedDepartureTime = formatDateTime(new Date(liane.liane.departureTime));

  console.log("liane id", liane.liane.id);
  return (
    <AppBottomSheetScrollView style={{ paddingHorizontal: 24, paddingTop: 24 }}>
      <DetailedLianeMatchView
        departureTime={liane.liane.departureTime}
        wayPoints={wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1)}
      />
      <Row style={{ justifyContent: "flex-end" }}>
        <AppRoundedButton
          backgroundColor={AppColors.orange}
          text={"Rejoindre"}
          onPress={() => {
            navigation.navigate({
              name: "RequestJoin",
              params: {
                request: toJoinLianeRequest(
                  {
                    ...getSearchFilter(state.context.filter),
                    to: state.context.filter.to!,
                    from: state.context.filter.from!
                  },
                  liane,
                  ""
                )
              },
              key: "req"
            });
          }}
        />
      </Row>
    </AppBottomSheetScrollView>
  );
};

/*
{"mairie:65382": {"hours": ["2023-04-15T07:30:37.276Z"], "pickup": {"address": "Le Village", "city": "Sacoué", "id": "mairie:65382", "isActive": true, "label": "Mairie de Sacoué", "location": [Object], "placeCount": null, "type": "TownHall", "zipCode": "65370"}}}
 */

export const LianeNearestLinks = () => {
  const { services } = useContext(AppContext);
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);

  const mapCenter = state.context.filter.displayBounds ? getCenter(state.context.filter.displayBounds) : undefined;
  const closestRallyingPointQuery = useQuery(["getClosestRP", mapCenter], () => services.rallyingPoint.snap(mapCenter!), {
    enabled: !!mapCenter
  });

  const nearestLinksQuery = useQuery(
    ["getNearestLinks", closestRallyingPointQuery.data?.id],
    () => services.liane.nearestLinks(closestRallyingPointQuery.data!.location, 40000),
    {
      enabled: !!closestRallyingPointQuery.data
    }
  );
  // const sectionData = useMemo(() => (nearestLinksQuery?.data || []).map(d => ({ ...d, data: d.destinations })), [nearestLinksQuery?.data]);

  if (!nearestLinksQuery.data) {
    return <ActivityIndicator />;
  }
  /*
  const renderSectionHeader = ({ section }) => {
    return (
      <View style={{ justifyContent: "flex-start", paddingHorizontal: 16, flex: 1, width: "100%" }}>
        <View style={{ flexShrink: 1, backgroundColor: AppColorPalettes.orange[500], borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 }}>
          <AppText style={{ color: AppColors.white, fontWeight: "bold", flexShrink: 1 }}>{section.pickup.label}</AppText>
        </View>
        <View style={{ flexGrow: 1, width: "90%" }} />
        {section.data.length === 0 && (
          <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "flex-start" }]}>Aucun trajet.</AppText>
        )}
      </View>
    );
  };
  const renderItem = ({ item, section }) => {
    return (
      <LianeDestinationView
        onPress={() => {
          send("UPDATE", { data: { from: section.pickup, to: item.deposit } });
          send("FORM");
        }}
        item={item}
      />
    );
  };*/
  console.log("n", nearestLinksQuery.data?.length);
  return (
    <AppBottomSheetScrollView style={{ flex: 1 }}>
      {nearestLinksQuery.data.length === 0 && <EmptyResultView />}
      {nearestLinksQuery.data.slice(0, Math.min(8, nearestLinksQuery.data.length)).map(section => {
        return (
          <Column key={section.pickup.id!} style={{ marginBottom: 16 }}>
            <Row style={{ justifyContent: "flex-start", paddingHorizontal: 16, flex: 1, width: "100%" }}>
              <View style={{ backgroundColor: AppColorPalettes.orange[500], borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 }}>
                <AppText style={{ color: AppColors.white, fontWeight: "bold", flexShrink: 1 }}>{section.pickup.label}</AppText>
              </View>

              {section.destinations.length === 0 && (
                <AppText style={[{ paddingHorizontal: 24, paddingVertical: 8, alignSelf: "flex-start" }]}>Aucun trajet.</AppText>
              )}
            </Row>
            {section.destinations.map(item => {
              return (
                <LianeDestinationView
                  key={item.deposit.id!}
                  onPress={() => {
                    machine.send("UPDATE", { data: { from: section.pickup, to: item.deposit } });
                    machine.send("FORM");
                  }}
                  item={item}
                />
              );
            })}
          </Column>
        );
      })}
    </AppBottomSheetScrollView>
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
  } = useQuery(["getNearestLinks", props.pickup.id], async () => {
    const res = await services.liane.nearestLinks(props.pickup.location, 50, props.date);
    console.log("res", res);
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
      {results.length === 0 && <EmptyResultView />}
      {false && results.length === 0 && (
        <Center style={{ paddingVertical: 8 }}>
          <AppRoundedButton
            backgroundColor={AppColors.orange}
            text={"Ajouter une annonce"}
            onPress={() => {
              //TODO
              /*navigation.navigate("LianeWizard", {
                formData: toLianeWizardFormData({
                  from: props.pickup
                })
              });*/
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
  return (
    <AppPressable foregroundColor={WithAlpha(AppColors.black, 0.1)} style={{ paddingHorizontal: 24, paddingVertical: 8 }} onPress={props.onPress}>
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
          <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.toLabel]}>{props.item.deposit.city}</AppText>
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
            <TimeView key={h} style={TripViewStyles.mainWayPointTime} value={toTimeInSeconds(new Date(h))} />
          ))}
        </Row>
      </Column>
    </AppPressable>
  );
};

export const LianeMatchListView = (props: { lianeList: LianeMatch[] | undefined; filter: any; onSelect: (l: LianeMatch) => void }) => {
  const displayedLianes = props.lianeList ?? [];
  const { navigation } = useAppNavigation();
  const data = useMemo(
    () =>
      (props.lianeList ?? []).map(item => {
        const lianeIsExactMatch = isExactMatch(item.match);
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
      <AppPressable
        foregroundColor={WithAlpha(AppColors.black, 0.1)}
        style={{ paddingHorizontal: 24, paddingVertical: 8 }}
        onPress={() => {
          props.onSelect(item.lianeMatch);
        }}>
        <TripSegmentView
          from={item.fromPoint}
          to={item.toPoint}
          departureTime={item.trip.departureTime}
          duration={item.tripDuration}
          freeSeatsCount={item.lianeMatch.freeSeatsCount}
        />
      </AppPressable>
    );
  };
  return (
    <Column spacing={8}>
      {displayedLianes.length > 0 && (
        <AppText style={{ paddingHorizontal: 24, fontWeight: "bold" }}>
          {displayedLianes.length} résultat{displayedLianes.length > 1 ? "s" : ""}
        </AppText>
      )}
      {displayedLianes.length === 0 && <EmptyResultView />}
      {displayedLianes.length === 0 && (
        <Center style={{ paddingVertical: 8 }}>
          <AppRoundedButton
            backgroundColor={AppColors.orange}
            text={"Ajouter une annonce"}
            onPress={() => {
              navigation.navigate("LianeWizard", {
                formData: toLianeWizardFormData({
                  ...getSearchFilter(props.filter),
                  to: props.filter.to!,
                  from: props.filter.from!
                })
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

const renderLianeOverview = (liane: Liane, onSelect: (lianeMatch: LianeMatch) => void) => {
  const freeSeatsCount = liane.members.map(l => l.seatCount).reduce((acc, c) => acc + c, 0);

  return (
    <AppPressable
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
        duration={getTotalDuration(liane.wayPoints)}
        from={liane.wayPoints[0].rallyingPoint}
        to={liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint}
        freeSeatsCount={freeSeatsCount}
      />
    </AppPressable>
  );
};

export const FilterSelector = ({ onExtend, extended = false }: { onExtend?: (expanded: boolean) => void; extended: boolean }) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);

  const [targetTime, setTargetTime] = useState<TargetTimeDirection>(state.context.filter.targetTime?.direction || "Departure");
  const [driver, setDriver] = useState<boolean>(state.context.filter.availableSeats > 0);
  const [date, setDate] = useState<Date>(state.context.filter.targetTime?.dateTime || new Date());

  const [prev, setPrev] = useState({ targetTime, driver, date });

  return (
    <View style={extended ? { flex: 1, flexGrow: 1, flexShrink: 1 } : {}}>
      <Row style={{ justifyContent: "space-between", paddingHorizontal: 16, width: "100%" }}>
        <AppPressable
          onPress={() => {
            if (extended) {
              // Update
              if (targetTime !== prev.targetTime || date !== prev.date || driver !== prev.driver) {
                machine.send("FILTER", { data: { targetTime: { direction: targetTime, dateTime: date }, availableSeats: driver ? 1 : -1 } });
              }
            } else {
              setPrev({ targetTime, driver, date });
            }
            if (onExtend) {
              onExtend(!extended);
            }
          }}
          style={{ paddingVertical: 6, paddingHorizontal: 6 }}
          backgroundStyle={{ borderRadius: 8, backgroundColor: AppColorPalettes.gray[200] }}>
          <Row style={{ alignItems: "center", justifyContent: "center" }} spacing={4}>
            <AppIcon name={"funnel-outline"} size={18} />
            <AppText style={{ fontWeight: "bold" }}>{"Filtrer"}</AppText>
            <AppIcon name={extended ? "arrow-up" : "arrow-down"} size={12} />
          </Row>
        </AppPressable>
        {!extended && (
          <DatePagerSelector
            date={date}
            onSelectDate={d => setDate(d)}
            formatter={d => {
              return (
                (state.context.filter.targetTime?.direction === "Arrival" ? "Arrivée " : "Départ ") +
                (isToday(d) ? "aujourd'hui" : formatShortMonthDay(d))
              );
            }}
          />
        )}
        {extended && (
          <AppPressable
            onPress={() => {
              setDate(new Date());
              setDriver(false);
              setTargetTime("Departure");
            }}
            style={{ paddingVertical: 6, paddingHorizontal: 6 }}
            backgroundStyle={{ borderRadius: 8 }}>
            <AppText style={{ textDecorationLine: "underline" }}>{"Réinitialiser"}</AppText>
          </AppPressable>
        )}
      </Row>
      {extended && (
        <View style={{ paddingVertical: 16, paddingHorizontal: 40, flex: 1 }}>
          <SwitchToggle
            isHeaderStyle={false}
            value={driver}
            onChange={() => setDriver(!driver)}
            color={AppColorPalettes.blue[400]}
            unselectedColor={AppColorPalettes.blue[100]}
            falseLabel={"Passager"}
            trueLabel={"Conducteur"}
            trueIcon={<AppCustomIcon name={"car"} size={18} />}
            falseIcon={<AppCustomIcon name={"car-strike-through"} size={18} />}
          />
          <Column style={{ alignItems: "stretch", paddingVertical: 16 }}>
            <SwitchToggle
              value={targetTime === "Departure"}
              onChange={() => setTargetTime(targetTime === "Arrival" ? "Departure" : "Arrival")}
              color={AppColorPalettes.yellow[500]}
              unselectedColor={AppColorPalettes.yellow[200]}
              falseLabel={"Arriver avant"}
              trueLabel={"Partir à"}
            />
            <Column
              style={{
                alignItems: "center",
                backgroundColor: AppColorPalettes.yellow[500],
                paddingTop: 8,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                marginTop: 1
              }}>
              <DatePagerSelector date={date} onSelectDate={d => setDate(d)} />
              <DatePicker
                androidVariant={"nativeAndroid"}
                mode="time"
                date={date}
                fadeToColor={"none"}
                onDateChange={d => setDate(d)}
                minimumDate={new Date()}
                minuteInterval={15}
              />
            </Column>
          </Column>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    position: "absolute",
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: AppColorPalettes.blue[100],
    alignSelf: "center",
    borderRadius: 24
  }
});
