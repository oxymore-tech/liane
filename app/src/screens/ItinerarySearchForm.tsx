import { Column, Row } from "@/components/base/AppLayout";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ColorValue, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { TripViewStyles } from "@/components/trip/TripSegmentView";
import { getKeyForTrip, Trip } from "@/api/service/location";
import { RallyingPoint, Ref } from "@/api";
import { AppContext } from "@/components/ContextProvider";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { useDebounceValue } from "@/util/hooks/debounce";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { ItineraryFormHeader } from "@/components/trip/ItineraryFormHeader";
import { Feature } from "geojson";
import { capitalize } from "@/util/strings";

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

export const CachedPlaceLocationsView = ({
  onSelect,
  showOpenMap,
  showUsePosition = true
}: {
  onSelect: (r: Feature) => void;
  showOpenMap?: () => void;
  showUsePosition?: boolean;
}) => {
  const { services } = useContext(AppContext);
  const [locationList, setRecentLocations] = useState<Feature[]>([]);

  useEffect(() => {
    services.location.getRecentPlaceLocations().then(r => {
      setRecentLocations(r);
    });
  }, [services.location]);

  const updateValue = (v: Feature) => {
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
          keyExtractor={r => r.properties!.ref || r.properties!.id!}
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
      <Column style={{ justifyContent: "space-evenly" }}>
        <AppText style={[styles.bold, styles.page, { color, fontSize: labelSize, minHeight: labelSize + 4 }]}>{item.label}</AppText>

        <AppText style={{ color, minHeight: 18 }} numberOfLines={1}>
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
  item: Feature;
  color?: ColorValue;
  labelSize?: number;
}) => {
  let placeTypeName = item.place_type_name?.[0];
  let placeName = item.place_name;
  let placeNameLine2: string | undefined;
  let iconName: IconName = "pin-outline";
  if (!placeTypeName) {
    if (item.place_type![0] === "rallying_point") {
      placeTypeName = "Point de ralliement";
      placeName = item.properties!.label!;
      iconName = "rallying-point";
      placeNameLine2 = (item.properties!.zipCode ? item.properties!.zipCode + ", " : "") + item.properties!.city;
    }
    if (item.place_type![0] === "poi") {
      if (item.properties?.categories.includes("bus stop")) {
        placeTypeName = "Arrêt de bus";
      }
      if (item.properties?.categories.includes("railway station")) {
        placeTypeName = "Gare";
      }
    }
  }
  if (placeName.endsWith(", France")) {
    placeName = placeName.substring(0, placeName.length - ", France".length) + ", " + item.context[item.context.length - 3].text;
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
  onSelect: (r: Feature) => void;
  //exceptValues?: Ref<RallyingPoint>[] | undefined;
}) => {
  const [results, setResults] = useState<Feature[]>([]);
  const { services } = useContext(AppContext);

  const debouncedSearch = useDebounceValue(props.currentSearch, 500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(undefined);

  const updateValue = async (v: Feature) => {
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
          setResults([
            ...queriesData[0].slice(0, Math.min(4, queriesData[0].length)).map(rp => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [rp.location.lng, rp.location.lat] },
              properties: { ...rp },
              place_type: ["rallying_point"]
            })),
            ...queriesData[1].features
          ]);
        })
        .catch(queriesErrors => {
          console.warn(queriesErrors);
          setError(queriesErrors[0] || queriesErrors[1]);
        });
      services.location.search(debouncedSearch, services.location.getLastKnownLocation()).then(r => {});
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
      keyExtractor={(i, index) => (i.properties!.ref || i.properties!.id) + index}
      renderItem={({ item, index }) => (
        <AppPressableOverlay
          key={(item.properties!.ref || item.properties!.id) + index}
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
