import { Column, Row } from "@/components/base/AppLayout";
import { ItineraryFormHeader } from "@/screens/home/HomeHeader";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ColorValue, FlatList, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { TripViewStyles } from "@/components/trip/TripSegmentView";
import { getKeyForTrip, Trip } from "@/api/service/location";
import { RallyingPoint } from "@/api";
import { AppContext } from "@/components/ContextProvider";
import { AppPressable } from "@/components/base/AppPressable";
import { AppCustomIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { useDebounceValue } from "@/util/hooks/debounce";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";

const CachedTripsView = (props: { onSelect: (trip: Trip) => void }) => {
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const { services } = useContext(AppContext);
  useEffect(() => {
    services.location.getRecentTrips().then(r => {
      setRecentTrips(r);
    });
  }, [services.location]);

  return (
    <View style={styles.page}>
      <AppText style={{ padding: 16, fontWeight: "bold" }}>Trajets récents</AppText>

      {recentTrips.length === 0 && <AppText style={{ padding: 16, alignSelf: "center", fontStyle: "italic" }}>Aucun trajet récent</AppText>}
      <FlatList
        data={recentTrips}
        key={i => getKeyForTrip(i)}
        renderItem={({ item }) => {
          return (
            <AppPressable
              onPress={async () => {
                props.onSelect(item);
              }}>
              <Row style={{ padding: 20 }} spacing={4}>
                <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.fromLabel]}>{item.from.label}</AppText>
                <View style={TripViewStyles.line} />
                <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.toLabel]}>{item.to.label}</AppText>
              </Row>
            </AppPressable>
          );
        }}
      />
    </View>
  );
};

const CachedLocationsView = (props: { onSelect: (r: RallyingPoint) => void }) => {
  const { services } = useContext(AppContext);
  const [recentLocations, setRecentLocations] = useState<RallyingPoint[]>([]);

  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);

  useEffect(() => {
    services.location.getRecentLocations().then(r => {
      setRecentLocations(r);
    });
  }, [services.location]);

  const updateValue = (v: RallyingPoint) => {
    props.onSelect(v);
    services.location.cacheRecentLocation(v).then(updated => setRecentLocations(updated));
  };

  const locationList = useMemo(() => {
    return recentLocations.filter(l => l.id !== state.context.filter.to?.id && l.id !== state.context.filter.from?.id);
  }, [state, recentLocations]);

  return (
    <View style={styles.page}>
      <AppPressable
        onPress={async () => {
          const currentLocation = await services.location.currentLocation();
          const closestPoint = await services.rallyingPoint.snap(currentLocation);
          updateValue(closestPoint);
        }}>
        <Row style={{ padding: 16, alignItems: "center" }} spacing={16}>
          <AppCustomIcon name={"position"} color={AppColors.blue} />
          <AppText>Utiliser ma position</AppText>
        </Row>
      </AppPressable>
      <AppText style={{ padding: 16, fontWeight: "bold" }}>Recherches récentes</AppText>
      <FlatList
        data={locationList}
        keyExtractor={r => r.id!}
        renderItem={({ item }) => (
          <AppPressable key={item.id!} style={{ paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => updateValue(item)}>
            <RallyingPointItem item={item} />
          </AppPressable>
        )}
      />
    </View>
  );
};

export const RallyingPointItem = ({
  item,
  color = AppColorPalettes.gray[800],
  labelSize = 14
}: {
  item: RallyingPoint;
  color?: ColorValue;
  labelSize?: number;
}) => {
  return (
    <Column>
      <AppText style={[styles.bold, styles.page, { color, fontSize: labelSize }]}>{item.label}</AppText>
      <AppText style={{ color }} numberOfLines={1}>
        {item.address}
      </AppText>
      <AppText style={{ color }} numberOfLines={1}>
        {item.zipCode + ", " + item.city}
      </AppText>
    </Column>
  );
};
const RallyingPointSuggestions = (props: { currentSearch: string | undefined; onSelect: (r: RallyingPoint) => void; fieldName: "to" | "from" }) => {
  const [results, setResults] = useState<RallyingPoint[]>([]);
  const { services } = useContext(AppContext);

  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);

  const debouncedSearch = useDebounceValue(props.currentSearch);
  const [loading, setLoading] = useState(false);

  const updateValue = async (v: RallyingPoint) => {
    props.onSelect(v);
    await services.location.cacheRecentLocation(v);
  };

  useEffect(() => {
    if (debouncedSearch) {
      setLoading(true);
      services.rallyingPoint.search(debouncedSearch, services.location.getLastKnownLocation()).then(r => {
        setLoading(false);
        setResults(r);
      });
    }
  }, [services.rallyingPoint, debouncedSearch, services.location]);

  const locationList = useMemo(() => {
    return results.filter(l => l.id !== state.context.filter[props.fieldName === "to" ? "from" : "to"]?.id);
  }, [state, results]);

  if (loading) {
    return <ActivityIndicator />;
  }

  if (results.length === 0) {
    return <AppText style={[{ padding: 16, color: AppColorPalettes.gray[600] }]}>Aucun résultat</AppText>;
  }

  return (
    <FlatList
      keyboardShouldPersistTaps="always"
      data={locationList}
      keyExtractor={i => i.id!}
      renderItem={({ item }) => (
        <AppPressable key={item.id!} style={{ paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => updateValue(item)}>
          <RallyingPointItem item={item} />
        </AppPressable>
      )}
    />
  );
};
export const ItinerarySearchForm = (props: { onSelectTrip: (trip: Trip) => void }) => {
  // const [currentTrip, setCurrentTrip] = useState<Partial<Trip>>(props.initialValues ?? { from: undefined, to: undefined });
  const [currentPoint, setCurrentPoint] = useState<"from" | "to" | undefined>();
  const [currentSearch, setCurrentSearch] = useState<string | undefined>();
  const insets = useSafeAreaInsets();
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const currentTrip = state.context.filter;

  return (
    <Column style={{ flex: 1 }}>
      <View style={{ height: 172 + insets.top }} />
      <ItineraryFormHeader
        onBackPressed={() => {
          machine.send("BACK");
        }}
        onChangeFrom={v => {
          setCurrentPoint("from");
          setCurrentSearch(v);
          if (v && v !== state.context.filter.from?.label) {
            machine.send("UPDATE", { data: { from: undefined } });
          }
        }}
        onChangeTo={v => {
          setCurrentPoint("to");
          setCurrentSearch(v);
          if (v && v !== state.context.filter.to?.label) {
            machine.send("UPDATE", { data: { to: undefined } });
          }
          //   setCurrentTrip({ ...currentTrip, to: undefined });
        }}
      />
      {!currentTrip.to && !currentTrip.from && currentPoint === undefined && (
        <CachedTripsView
          onSelect={trip => {
            props.onSelectTrip(trip);
          }}
        />
      )}
      {currentPoint !== undefined && (currentSearch === undefined || currentSearch.trim().length === 0) && (
        <CachedLocationsView
          onSelect={async rp => {
            machine.send("UPDATE", { data: { [currentPoint]: rp } });
            //setCurrentTrip({ ...currentTrip, [currentPoint]: rp });
          }}
        />
      )}

      {currentPoint !== undefined && (currentSearch?.trim()?.length ?? 0) > 0 && (
        <RallyingPointSuggestions
          fieldName={currentPoint}
          currentSearch={currentSearch}
          onSelect={rp => {
            machine.send("UPDATE", { data: { [currentPoint]: rp } });
            //setCurrentTrip({ ...currentTrip, [currentPoint]: rp });
            setCurrentPoint(undefined);
            setCurrentSearch(undefined);
          }}
        />
      )}
    </Column>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  bold: { fontWeight: "bold" }
});
