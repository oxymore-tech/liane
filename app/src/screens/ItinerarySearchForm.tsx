import { Column, Row } from "@/components/base/AppLayout";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ColorValue, FlatList, KeyboardAvoidingView, Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AppText } from "@/components/base/AppText";
import { TripViewStyles } from "@/components/trip/TripSegmentView";
import { asSearchedLocation, getKeyForTrip, isRallyingPointSearchedLocation, SearchedLocation, Trip } from "@/api/service/location";
import { RallyingPoint, Ref } from "@/api";
import { AppContext } from "@/components/context/ContextProvider";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { useDebounceValue } from "@/util/hooks/debounce";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { ItineraryFormHeader } from "@/components/trip/ItineraryFormHeader";
import { capitalize } from "@/util/strings";
import { filter } from "rxjs";

export const RecentTrip = ({ trip, style }: { trip: Trip; style?: StyleProp<ViewStyle> }) => {
  return (
    <Row style={style} spacing={8}>
      <Column style={{ justifyContent: "space-between", alignSelf: "stretch" }}>
        <View
          style={{
            backgroundColor: AppColorPalettes.gray[100],
            borderWidth: 1,
            borderColor: AppColorPalettes.gray[200],
            borderRadius: 16,
            alignSelf: "center"
          }}>
          <AppIcon name={"pin"} size={18} color={AppColors.orange} />
        </View>
        <View style={[TripViewStyles.verticalLine, { borderColor: AppColorPalettes.gray[300] }]} />
        <View
          style={{
            backgroundColor: AppColorPalettes.gray[100],
            borderWidth: 1,
            borderColor: AppColorPalettes.gray[200],
            borderRadius: 16,
            alignSelf: "center",
            marginBottom: 16
          }}>
          <AppIcon name={"flag"} size={18} color={AppColors.pink} />
        </View>
      </Column>

      <Column spacing={8}>
        <Column>
          <AppText style={[TripViewStyles.mainWayPointLabel, /*TripViewStyles.fromLabel,*/ { alignSelf: "flex-start", maxWidth: undefined }]}>
            {trip.from.label}
          </AppText>
          <AppText>{trip.from.city}</AppText>
        </Column>
        <Column>
          <AppText style={[TripViewStyles.mainWayPointLabel, /*TripViewStyles.toLabel,*/ { alignSelf: "flex-start", maxWidth: undefined }]}>
            {trip.to.label}
          </AppText>
          <AppText>{trip.to.city}</AppText>
        </Column>
      </Column>
    </Row>
  );
};

export const CachedTripsView = (props: { onSelect: (trip: Trip) => void; filter?: string }) => {
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const { services } = useContext(AppContext);
  useEffect(() => {
    services.location.getRecentTrips().then(r => {
      let trips = r;
      if (props.filter) {
        trips = trips.filter(t => (t.from.city + " " + t.to.city + " " + t.from.label + " " + t.to.label).includes(props.filter!));
      }
      setRecentTrips(trips);
    });
  }, [services.location, props.filter]);

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
              style={{ borderBottomWidth: 1, borderColor: AppColorPalettes.gray[200], marginHorizontal: 20 }}
              onPress={async () => {
                props.onSelect(item);
              }}>
              <RecentTrip trip={item} style={{ marginHorizontal: 0, marginVertical: 12 }} />
            </AppPressableOverlay>
          );
        }}
      />
    </Animated.View>
  );
};

export const CachedPlaceLocationsView = ({
  onSelect,
  showOpenMap,
  showUsePosition = true
}: {
  onSelect: (r: SearchedLocation) => void;
  showOpenMap?: () => void;
  showUsePosition?: boolean;
}) => {
  const { services } = useContext(AppContext);
  const [locationList, setRecentLocations] = useState<Array<SearchedLocation>>([]);

  useEffect(() => {
    services.location.getRecentPlaceLocations().then(r => {
      setRecentLocations(r);
    });
  }, [services.location]);

  const updateValue = (v: SearchedLocation) => {
    onSelect(v);
    services.location.cacheRecentPlaceLocation(v).then(updated => setRecentLocations(updated));
  };

  return (
    <View style={styles.page}>
      {showUsePosition && (
        <AppPressableOverlay
          onPress={async () => {
            //const currentLocation = await services.location.currentLocation();
            // TODO revese geocoding
            //  updateValue(closestPoint);
          }}>
          <Row style={{ padding: 16, alignItems: "center" }} spacing={16}>
            <AppIcon name={"position-on"} color={AppColors.blue} />
            <AppText>Utiliser ma position</AppText>
          </Row>
        </AppPressableOverlay>
      )}
      {showOpenMap && (
        <AppPressableOverlay onPress={showOpenMap}>
          <Row style={{ padding: 16, alignItems: "center" }} spacing={16}>
            <AppIcon name={"map-outline"} color={AppColorPalettes.blue[700]} />
            <AppText>Choisir sur la carte</AppText>
          </Row>
        </AppPressableOverlay>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "position" : undefined}>
        {locationList.length > 0 && <AppText style={{ padding: 16, fontWeight: "bold", fontSize: 16 }}>Recherches récentes</AppText>}
        <FlatList
          keyboardShouldPersistTaps="always"
          data={locationList}
          keyExtractor={v => (isRallyingPointSearchedLocation(v) ? v.properties!.id! : v.properties!.ref)}
          renderItem={({ item }) => (
            <AppPressableOverlay key={item.id!} style={{ paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => updateValue(item)}>
              <PlaceItem item={item} />
            </AppPressableOverlay>
          )}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

export const CachedLocationsView = ({
  onSelect,
  exceptValues,
  showOpenMap,
  showUsePosition = true
}: {
  onSelect: (r: RallyingPoint) => void;
  exceptValues?: Ref<RallyingPoint>[] | undefined;
  showOpenMap?: () => void;
  showUsePosition?: boolean;
}) => {
  const { services } = useContext(AppContext);
  const [recentLocations, setRecentLocations] = useState<RallyingPoint[]>([]);

  useEffect(() => {
    services.location.getRecentLocations().then(r => {
      setRecentLocations(r);
    });
  }, [services.location]);

  const updateValue = (v: RallyingPoint) => {
    onSelect(v);
    services.location.cacheRecentLocation(v).then(updated => setRecentLocations(updated));
  };

  const locationList = useMemo(() => {
    if (exceptValues) {
      return recentLocations.filter(l => !exceptValues!.includes(l.id!));
    } else {
      return recentLocations;
    }
  }, [exceptValues, recentLocations]);

  return (
    <View style={styles.page}>
      {showUsePosition && (
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
      )}
      {showOpenMap && (
        <AppPressableOverlay onPress={showOpenMap}>
          <Row style={{ padding: 16, alignItems: "center" }} spacing={16}>
            <AppIcon name={"map-outline"} color={AppColorPalettes.blue[700]} />
            <AppText>Choisir sur la carte</AppText>
          </Row>
        </AppPressableOverlay>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "position" : undefined}>
        {locationList.length > 0 && <AppText style={{ padding: 16, fontWeight: "bold", fontSize: 16 }}>Recherches récentes</AppText>}
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
  labelSize = 14,
  showIcon = true
}: {
  item: RallyingPoint;
  color?: ColorValue;
  labelSize?: number;
  showIcon?: boolean;
}) => {
  return (
    <Row style={{ alignItems: "center", flex: 1 }} spacing={16}>
      {showIcon && <AppIcon name={"rallying-point"} size={28} color={color} />}
      <Column style={{ justifyContent: "space-evenly", flex: 1 }}>
        <AppText style={[styles.bold, styles.page, { color, fontSize: labelSize }]}>{item.label}</AppText>

        <AppText style={{ color }} numberOfLines={1}>
          {(item.zipCode ? item.zipCode + ", " : "") + item.city}
        </AppText>
      </Column>
    </Row>
  );
};

export const PlaceItem = ({
  item,
  color = AppColorPalettes.gray[800],
  labelSize = 14
}: {
  item: SearchedLocation;
  color?: ColorValue;
  labelSize?: number;
}) => {
  let placeTypeName;
  let placeName;
  let placeNameLine2: string | undefined;
  let iconName: IconName = "pin-outline";

  if (isRallyingPointSearchedLocation(item)) {
    placeTypeName = "Point de ralliement";
    placeName = item.properties!.label!;
    iconName = "rallying-point";
    placeNameLine2 = (item.properties!.zipCode ? item.properties!.zipCode + ", " : "") + item.properties!.city;
  } else {
    placeTypeName = item.place_type_name?.[0];
    placeName = item.place_name;
    if (!placeTypeName && item.place_type![0] === "poi") {
      if (item.properties?.categories.includes("bus stop")) {
        placeTypeName = "Arrêt de bus";
      }
      if (item.properties?.categories.includes("railway station")) {
        placeTypeName = "Gare";
      }
    }

    if (placeName.endsWith(", France") && item.context.length >= 3) {
      placeName = placeName.substring(0, placeName.length - ", France".length) + ", " + item.context[item.context.length - 3].text;
    }
  }
  return (
    <Row style={{ alignItems: "center" }} spacing={16}>
      <AppIcon name={iconName} size={28} />
      <Column style={{ flex: 1 }}>
        <AppText style={{ color, fontSize: 11 }} numberOfLines={1}>
          {capitalize(placeTypeName) || "Lieu"}
        </AppText>
        <AppText numberOfLines={2} style={[styles.bold, styles.page, { color, fontSize: labelSize }]}>
          {placeName}
          {placeNameLine2 ? "\n" + placeNameLine2 : ""}
        </AppText>
      </Column>
    </Row>
  );
};
export const RallyingPointSuggestions = (props: {
  currentSearch: string | undefined;
  onSelect: (r: RallyingPoint) => void;
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

export const PlaceSuggestions = (props: {
  currentSearch: string | undefined;
  onSelect: (r: SearchedLocation) => void;
  //exceptValues?: Ref<RallyingPoint>[] | undefined;
}) => {
  const [results, setResults] = useState<SearchedLocation[]>([]);
  const { services } = useContext(AppContext);

  const debouncedSearch = useDebounceValue(props.currentSearch, 500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(undefined);

  const updateValue = async (v: SearchedLocation) => {
    props.onSelect(v);
    // TODO await services.location.cacheRecentLocation(v);
  };

  useEffect(() => {
    if (debouncedSearch) {
      setLoading(true);
      Promise.all([
        services.rallyingPoint.search(debouncedSearch, services.location.getLastKnownLocation()),
        services.location.search(debouncedSearch, services.location.getLastKnownLocation())
      ])
        .then(queriesData => {
          setLoading(false);
          setResults([...queriesData[0].slice(0, Math.min(4, queriesData[0].length)).map(rp => asSearchedLocation(rp)), ...queriesData[1].features]);
        })
        .catch(queriesErrors => {
          console.warn(queriesErrors);
          setError(queriesErrors[0] || queriesErrors[1]);
        });
      services.location.search(debouncedSearch, services.location.getLastKnownLocation()).catch(e => console.warn(e));
    }
  }, [debouncedSearch]);

  /*const locationList = useMemo(() => {
    if (props.exceptValues) {
      return results.filter(l => !props.exceptValues!.includes(l.id!));
    }
    return results;
  }, [props.exceptValues, results]);*/

  if (loading) {
    return <ActivityIndicator />;
  }

  if (error) {
    return <AppText style={[{ padding: 16, color: ContextualColors.redAlert.text }]}>{error}</AppText>;
  }

  if (results.length === 0) {
    return <AppText style={[{ padding: 16, color: AppColorPalettes.gray[600] }]}>Aucun résultat</AppText>;
  }
  return (
    <FlatList
      keyboardShouldPersistTaps="always"
      data={results}
      keyExtractor={(item, index) => (isRallyingPointSearchedLocation(item) ? item.properties!.id! : item.properties!.ref) + index}
      renderItem={({ item, index }) => (
        <AppPressableOverlay
          key={(isRallyingPointSearchedLocation(item) ? item.properties!.id! : item.properties!.ref) + index}
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          onPress={() => updateValue(item)}>
          <PlaceItem item={item} />
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
          showOpenMap={openMap}
        />
      )}

      {!offline && editable && currentPoint !== undefined && (currentSearch?.trim()?.length ?? 0) > 0 && (
        <RallyingPointSuggestions
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
