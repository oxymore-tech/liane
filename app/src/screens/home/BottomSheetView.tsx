import { AppStyles } from "@/theme/styles";
import { Center, Column, Row } from "@/components/base/AppLayout";
import React, { PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { getPoint, isExactMatch, Liane, LianeMatch, RallyingPoint, Ref, TargetTimeDirection, UTCDateTime } from "@/api";
import { AppPressable } from "@/components/base/AppPressable";
import { TripSegmentView, TripViewStyles } from "@/components/trip/TripSegmentView";
import { getTotalDuration, getTrip } from "@/components/trip/trip";
import { AppText } from "@/components/base/AppText";
import { filterHasFullTrip, getSearchFilter, HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import { LianeDetailedMatchView } from "@/components/trip/LianeMatchView";
import { AppContext } from "@/components/ContextProvider";
import { TimeView } from "@/components/TimeView";
import { isToday, toTimeInSeconds } from "@/util/datetime";
import { DatePagerSelector } from "@/components/DatePagerSelector";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { toLianeWizardFormData } from "@/screens/search/SearchFormData";
import { useAppNavigation } from "@/api/navigation";

import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { formatShortMonthDay } from "@/api/i18n";
import { SwitchToggle } from "@/components/forms/SelectToggleForm";
import DatePicker from "react-native-date-picker";
import { AppBottomSheet, AppBottomSheetHandleHeight } from "@/components/base/AppBottomSheet";
import { useBottomBarStyle } from "@/components/Navigation";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppDimensions } from "@/theme/dimensions";
import Animated from "react-native-reanimated";

export const HomeBottomSheetContainer = (props: { display?: boolean } & PropsWithChildren) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const isMapState = state.matches("map");
  const { navigation } = useAppNavigation<"Home">();

  const bbStyle = useBottomBarStyle();
  React.useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: [...bbStyle, { display: isMapState ? undefined : "none" }] //{transform: [{translateY: state.matches("map") ? 0 : 80}]}]
    });
  });

  const insets = useSafeAreaInsets();
  const h = useBottomTabBarHeight();
  const bottomSpace = insets.bottom + AppDimensions.bottomBar.marginVertical + h / 2;
  console.log(Platform.OS, h, insets, StatusBar.currentHeight, bottomSpace);
  return props.display === false ? (
    <View />
  ) : (
    <AppBottomSheet
      stops={[...(isMapState ? [AppBottomSheetHandleHeight + h / 2 + 16] : []), 0.3, 1]}
      padding={{ top: 40 + insets.top }}
      margins={{ right: isMapState ? 24 : 8, left: isMapState ? 24 : 8, bottom: isMapState ? bottomSpace : 0 }}>
      {props.children}
    </AppBottomSheet>
  );
  /*return (
    <Animated.View
      //exiting={SlideOutDown}
      // entering={SlideInDown}
      style={[
        styles.footerContainer,
        AppStyles.shadow,
        { maxHeight: 240 },
        state.matches("map") ? {} : { bottom: 0, paddingBottom: 16, left: 8, right: 8 }
      ]}>
      {props.children}
    </Animated.View>
  );*/
};

export const FilterListView = ({ loading = false }: { loading?: boolean }) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  return (
    <Column spacing={8}>
      {["map", "point", "match"].some(state.matches) && <FilterSelector />}
      {loading && <ActivityIndicator />}
      {!loading && ["map", "match"].some(state.matches) && (
        <LianeMatchListView
          onSelect={l => machine.send("DETAIL", { data: l })}
          lianeList={state.context.matches}
          filter={filterHasFullTrip(state.context.filter) ? { to: state.context.filter.to!, from: state.context.filter.from! } : undefined}
        />
      )}
      {state.matches("point") && <LianeDestinations pickup={state.context.filter.from!} date={state.context.filter.targetTime?.dateTime} />}
    </Column>
  );
};

//TODO
const EmptyResultView = () => <AppText style={[{ paddingHorizontal: 24, alignSelf: "center" }]}>Aucune liane dans cette zone.</AppText>;

export const LianeMatchDetail = (props: { lianeMatch: LianeMatch }) => {
  const liane = props.lianeMatch;
  const lianeIsExactMatch = isExactMatch(liane.match);

  const fromPoint = getPoint(liane, "pickup");
  const toPoint = getPoint(liane, "deposit");

  //const formattedDepartureTime = formatDateTime(new Date(liane.liane.departureTime));

  const wayPoints = lianeIsExactMatch ? liane.liane.wayPoints : liane.match.wayPoints;
  console.log("liane id", liane.liane.id);
  return (
    <ScrollView style={{ paddingHorizontal: 24, paddingTop: 24 }}>
      <LianeDetailedMatchView
        from={fromPoint}
        to={toPoint}
        departureTime={liane.liane.departureTime}
        originalTrip={liane.liane.wayPoints}
        newTrip={wayPoints}
      />
    </ScrollView>
  );
};

/*
{"mairie:65382": {"hours": ["2023-04-15T07:30:37.276Z"], "pickup": {"address": "Le Village", "city": "Sacoué", "id": "mairie:65382", "isActive": true, "label": "Mairie de Sacoué", "location": [Object], "placeCount": null, "type": "TownHall", "zipCode": "65370"}}}
 */

export const LianeDestinations = (props: { pickup: RallyingPoint; date: Date | undefined }) => {
  const { services } = useContext(AppContext);
  const { send } = useContext(HomeMapContext);
  const [results, setResults] = useState<Map<Ref<RallyingPoint>, { deposit: RallyingPoint; hours: UTCDateTime[] }>>();
  useEffect(() => {
    services.liane.links(props.pickup.id!, props.date).then(res => {
      console.log("res", res);
      setResults(new Map(Object.entries(res)));
    });
  }, [props.pickup.id, props.date, services]);
  if (!results) {
    return <ActivityIndicator />;
  }
  return (
    <Column spacing={8}>
      {results.size > 0 && (
        <AppText style={{ paddingHorizontal: 24, fontWeight: "bold" }}>
          {results.size} résultat{results.size > 1 ? "s" : ""}
        </AppText>
      )}
      {results.size === 0 && <EmptyResultView />}
      <FlatList
        data={[...results.values()]}
        keyExtractor={i => i.deposit.id!}
        renderItem={({ item }) => {
          return (
            <AppPressable
              foregroundColor={WithAlpha(AppColors.black, 0.1)}
              style={{ paddingHorizontal: 24, paddingVertical: 8 }}
              onPress={() => {
                send("UPDATE", { data: { from: props.pickup, to: item.deposit } });
              }}>
              <Column spacing={4}>
                <Row spacing={4}>
                  <View style={TripViewStyles.line} />
                  <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.toLabel]}>{item.deposit.city}</AppText>
                </Row>
                <Row style={{ justifyContent: "flex-start" }}>
                  <AppText style={TripViewStyles.mainWayPointTime}>Départ à </AppText>
                  {item.hours.map(h => (
                    <TimeView key={h} style={TripViewStyles.mainWayPointTime} value={toTimeInSeconds(new Date(h))} />
                  ))}
                </Row>
              </Column>
            </AppPressable>
          );
        }}
      />
    </Column>
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
        <Center>
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
      <FlatList data={data} keyExtractor={i => i.lianeMatch.liane.id!} renderItem={renderItem} />
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

export const FilterSelector = () => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);

  const [extended, setExtended] = useState(false);

  const [targetTime, setTargetTime] = useState<TargetTimeDirection>(state.context.filter.targetTime?.direction || "Departure");
  const [driver, setDriver] = useState<boolean>(state.context.filter.availableSeats > 0);
  const [date, setDate] = useState<Date>(state.context.filter.targetTime?.dateTime || new Date());

  const [prev, setPrev] = useState({ targetTime, driver, date });

  return (
    <View>
      <Row style={{ justifyContent: "space-between", paddingHorizontal: 16 }}>
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
            setExtended(!extended);
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
                (state.context.filter.targetTime?.direction === "Departure" ? "Départ " : "Arrivée ") +
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
        <View style={{ paddingVertical: 16, paddingHorizontal: 40, flex: 1, height: 200 }}>
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
          <Column style={{ alignItems: "stretch", paddingVertical: 32 }}>
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
                paddingVertical: 8,
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

const styles = StyleSheet.create({});
