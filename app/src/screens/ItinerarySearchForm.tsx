import { Column, Row } from "@/components/base/AppLayout";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ColorValue, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { TripViewStyles } from "@/components/trip/TripSegmentView";
import { getKeyForTrip, Trip } from "@/api/service/location";
import { RallyingPoint, Ref } from "@/api";
import { AppContext } from "@/components/ContextProvider";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { useDebounceValue } from "@/util/hooks/debounce";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { ItineraryFormHeader } from "@/components/trip/ItineraryFormHeader";

export const CachedTripsView = (props: { onSelect: (trip: Trip) => void }) => {
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const { services } = useContext(AppContext);
  useEffect(() => {
    services.location.getRecentTrips().then(r => {
      setRecentTrips(r);
    });
  }, [services.location]);

  return (
    <Animated.View style={styles.page} entering={FadeIn}>
      <AppText style={{ padding: 16, fontWeight: "bold", fontSize: 16 }}>Trajets récents</AppText>

      {recentTrips.length === 0 && <AppText style={{ padding: 16, alignSelf: "center", fontStyle: "italic" }}>Aucun trajet récent</AppText>}
      <FlatList
        data={recentTrips}
        keyExtractor={i => getKeyForTrip(i)}
        renderItem={({ item }) => {
          return (
            <AppPressableOverlay
              onPress={async () => {
                props.onSelect(item);
              }}>
              <Row style={{ marginHorizontal: 20, flexWrap: "wrap", marginVertical: 12 }} spacing={8}>
                <Column style={{ paddingTop: 6, paddingBottom: 22 }}>
                  <View style={{ height: 8, width: 8, backgroundColor: AppColorPalettes.gray[200], borderRadius: 8 }} />
                  <View style={{ alignSelf: "center", flex: 1, borderLeftWidth: 1, borderLeftColor: AppColorPalettes.gray[200] }} />
                  <View style={{ height: 8, width: 8, backgroundColor: AppColorPalettes.gray[200], borderRadius: 8 }} />
                </Column>
                <Column spacing={8}>
                  <Column>
                    <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.fromLabel, { alignSelf: "flex-start", maxWidth: undefined }]}>
                      {item.from.label}
                    </AppText>
                    <AppText>{item.from.city}</AppText>
                  </Column>
                  <Column>
                    <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.toLabel, { alignSelf: "flex-start", maxWidth: undefined }]}>
                      {item.to.label}
                    </AppText>
                    <AppText>{item.to.city}</AppText>
                  </Column>
                </Column>
              </Row>
            </AppPressableOverlay>
          );
        }}
      />
    </Animated.View>
  );
};

export const CachedLocationsView = (props: {
  onSelect: (r: RallyingPoint) => void;
  exceptValues?: Ref<RallyingPoint>[] | undefined;
  openMap?: () => void;
}) => {
  const { services } = useContext(AppContext);
  const [recentLocations, setRecentLocations] = useState<RallyingPoint[]>([]);

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
    if (props.exceptValues) {
      return recentLocations.filter(l => !props.exceptValues!.includes(l.id!));
    }
  }, [props.exceptValues, recentLocations]);

  return (
    <View style={styles.page}>
      <AppPressableOverlay
        onPress={async () => {
          const currentLocation = await services.location.currentLocation();
          const closestPoint = await services.rallyingPoint.snap(currentLocation);
          updateValue(closestPoint);
        }}>
        <Row style={{ padding: 16, alignItems: "center" }} spacing={16}>
          <AppIcon name={"position-on"} color={AppColors.blue} />
          <AppText>Utiliser ma position</AppText>
        </Row>
      </AppPressableOverlay>
      {props.openMap && (
        <AppPressableOverlay onPress={props.openMap}>
          <Row style={{ padding: 16, alignItems: "center" }} spacing={16}>
            <AppIcon name={"map-outline"} color={AppColorPalettes.blue[700]} />
            <AppText>Choisir sur la carte</AppText>
          </Row>
        </AppPressableOverlay>
      )}
      <KeyboardAvoidingView style={{ backgroundColor: AppColorPalettes.gray[100] }} behavior={Platform.OS === "ios" ? "position" : undefined}>
        <AppText style={{ padding: 16, fontWeight: "bold", fontSize: 16 }}>Recherches récentes</AppText>
        <FlatList
          keyboardShouldPersistTaps="always"
          data={locationList}
          keyExtractor={r => r.id!}
          renderItem={({ item }) => (
            <AppPressableOverlay key={item.id!} style={{ paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => updateValue(item)}>
              <RallyingPointItem item={item} />
            </AppPressableOverlay>
          )}
        />
      </KeyboardAvoidingView>
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
export const RallyingPointSuggestions = (props: {
  currentSearch: string | undefined;
  onSelect: (r: RallyingPoint) => void;
  fieldName: "to" | "from";
  exceptValues?: Ref<RallyingPoint>[] | undefined;
}) => {
  const [results, setResults] = useState<RallyingPoint[]>([]);
  const { services } = useContext(AppContext);

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
    if (props.exceptValues) {
      return results.filter(l => !props.exceptValues!.includes(l.id!));
    }
    return results;
  }, [props.exceptValues, results]);

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
        <AppPressableOverlay key={item.id!} style={{ paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => updateValue(item)}>
          <RallyingPointItem item={item} />
        </AppPressableOverlay>
      )}
    />
  );
};

export interface ItinerarySearchFormProps {
  trip: Partial<Trip>;
  onSelectTrip: (trip: Trip) => void;
  updateTrip: (trip: Partial<Trip>) => void;
  title?: string;
  animateEntry?: boolean;
  openMap?: () => void;
  editable?: boolean;
}
export const ItinerarySearchForm = ({
  onSelectTrip,
  trip: currentTrip,
  updateTrip,
  title,
  openMap,
  animateEntry = true,
  editable = true
}: ItinerarySearchFormProps) => {
  const [currentPoint, setCurrentPoint] = useState<"from" | "to" | undefined>();
  const [currentSearch, setCurrentSearch] = useState<string | undefined>();
  const insets = useSafeAreaInsets();
  // const machine = useContext(HomeMapContext);
  // const [state] = useActor(machine);
  // const currentTrip = state.context.filter;
  const otherValue = currentPoint ? currentTrip[currentPoint === "to" ? "from" : "to"] : undefined;
  const { status } = useContext(AppContext);
  const offline = status === "offline";

  return (
    <Column style={{ flex: editable ? 1 : undefined }}>
      <View style={{ height: 172 + insets.top }} />
      <ItineraryFormHeader
        title={title}
        editable={editable}
        animateEntry={animateEntry}
        onRequestFocus={field => {
          setCurrentPoint(field);
        }}
        onChangeField={(field, v) => {
          setCurrentPoint(field);
          setCurrentSearch(v);
          if (v && v !== currentTrip[field]?.label) {
            updateTrip({ [field]: undefined });
            //updateField(field, undefined);
            //  machine.send("UPDATE", { data: { from: undefined } });
          } else if (!v) {
            updateTrip({ [field]: undefined });
          }
        }}
        trip={currentTrip}
        updateTrip={updateTrip}
      />
      {!offline && editable && !currentTrip.to && !currentTrip.from && currentPoint === undefined && (
        <CachedTripsView
          onSelect={trip => {
            onSelectTrip(trip);
          }}
        />
      )}
      {!offline && editable && currentPoint !== undefined && (currentSearch === undefined || currentSearch.trim().length === 0) && (
        <CachedLocationsView
          exceptValues={[currentTrip.to?.id, currentTrip.from?.id].filter(i => i !== undefined) as string[]}
          onSelect={async rp => {
            updateTrip({ [currentPoint]: rp });
          }}
          openMap={openMap}
        />
      )}

      {!offline && editable && currentPoint !== undefined && (currentSearch?.trim()?.length ?? 0) > 0 && (
        <RallyingPointSuggestions
          fieldName={currentPoint}
          currentSearch={currentSearch}
          exceptValues={otherValue ? [otherValue.id!] : undefined}
          onSelect={rp => {
            updateTrip({ [currentPoint]: rp });
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
