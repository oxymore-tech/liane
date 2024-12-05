import { Center, Column, Row } from "@/components/base/AppLayout";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ColorValue, FlatList, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AppText } from "@/components/base/AppText";
import { TripViewStyles } from "@/components/trip/TripSegmentView";
import {
  asSearchedLocation,
  CoLiane,
  getKeyForTrip,
  isRallyingPointSearchedLocation,
  RallyingPoint,
  Ref,
  SearchedLocation,
  Itinerary
} from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import Animated, { FadeIn } from "react-native-reanimated";
import { ItineraryFormHeader, ToOrFrom } from "@/components/trip/ItineraryFormHeader";
import { AppStyles } from "@/theme/styles";
import { useDebounceValue } from "@/util/hooks/debounce";
import { AppBackContextProvider } from "@/components/AppBackContextProvider.tsx";
import { SelectOnMapView } from "@/screens/publish/SelectOnMapView.tsx";

export const RecentTrip = ({ trip, style }: { trip: Itinerary; style?: StyleProp<ViewStyle> }) => {
  return (
    <Row style={style} spacing={12}>
      <Column style={{ justifyContent: "space-between", alignSelf: "stretch", paddingVertical: 8 }}>
        <AppIcon name={"flag"} size={24} color={AppColors.primaryColor} />
        <View style={[TripViewStyles.verticalLine]} />
        <AppIcon name={"pin"} size={24} color={AppColors.primaryColor} />
      </Column>

      <Column spacing={8}>
        <Column>
          <AppText style={[TripViewStyles.mainWayPointCity, { alignSelf: "flex-start", maxWidth: undefined }]}>{trip.to.city}</AppText>
          <AppText style={[TripViewStyles.mainWayPointLabel]}>{trip.to.label}</AppText>
        </Column>
        <Column>
          <AppText style={[TripViewStyles.mainWayPointCity, { alignSelf: "flex-start", maxWidth: undefined }]}>{trip.from.city}</AppText>
          <AppText style={[TripViewStyles.mainWayPointLabel]}>{trip.from.label}</AppText>
        </Column>
      </Column>
    </Row>
  );
};

export const CachedTripsView = (props: { onSelect: (trip: Itinerary) => void; filter?: string }) => {
  const [recentTrips, setRecentTrips] = useState<Itinerary[]>([]);
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
      {recentTrips.length === 0 ? (
        <Center>
          <AppText style={AppStyles.noData}>Aucun trajet récent</AppText>
        </Center>
      ) : (
        <FlatList
          data={recentTrips}
          keyExtractor={i => getKeyForTrip(i)}
          renderItem={({ item, index }) => {
            return (
              <AppPressableOverlay
                style={[index !== recentTrips.length - 1 ? { borderBottomWidth: 1, borderColor: AppColorPalettes.gray[200] } : {}]}
                onPress={async () => props.onSelect(item)}>
                <RecentTrip trip={item} style={{ marginHorizontal: 16, marginVertical: 12 }} />
              </AppPressableOverlay>
            );
          }}
        />
      )}
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
            const currentLocation = await services.location.currentLocation();
            const results = await services.location.name(currentLocation);
            if (results.features.length > 0) {
              updateValue(results.features[0]);
            }
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

      {locationList.length > 0 && <AppText style={{ padding: 16, fontWeight: "bold", fontSize: 16 }}>Recherches récentes</AppText>}
      <FlatList
        style={{ paddingVertical: 8 }}
        keyboardShouldPersistTaps="always"
        data={locationList}
        keyExtractor={v => (isRallyingPointSearchedLocation(v) ? v.properties!.id! : v.properties!.ref)}
        renderItem={({ item, index }) => (
          <AppPressableOverlay
            key={item.id!}
            style={[
              styles.placeItemStyle,
              index !== locationList.length - 1 ? { borderBottomWidth: 1, borderColor: AppColorPalettes.gray[200] } : {}
            ]}
            onPress={() => updateValue(item)}>
            <PlaceItem item={item} labelSize={18} />
          </AppPressableOverlay>
        )}
      />
    </View>
  );
};

export const RallyingPointItem = ({
  item,
  labelSize = 14,
  detailed = false,
  showIcon = true,
  icon = "position-marker",
  iconColor = AppColorPalettes.gray[800]
}: {
  item: RallyingPoint;
  color?: ColorValue;
  labelSize?: number;
  showIcon?: boolean;
  detailed?: boolean;
  icon?: IconName;
  iconColor?: ColorValue;
}) => {
  return (
    <Row spacing={16}>
      {showIcon && <AppIcon name={icon} size={22} color={iconColor} />}
      <Column>
        <AppText style={[styles.bold, styles.page, { color: AppColorPalettes.gray[800], fontSize: labelSize }]}>{item.label}</AppText>

        {detailed && (
          <AppText style={{ color: AppColorPalettes.gray[600] }} numberOfLines={1}>
            {item.address}
          </AppText>
        )}
        <AppText style={{ color: AppColorPalettes.gray[600] }} numberOfLines={1}>
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
  let placeName: string | undefined;
  let cityName: string;
  let iconName: IconName = "pin";

  if (isRallyingPointSearchedLocation(item)) {
    placeName = item.properties!.label!;
    iconName = "rallying-point";
    cityName = item.properties!.city;
  } else {
    placeTypeName = item.place_type_name?.[0];
    cityName = item.place_name;
    if (!placeTypeName && item.place_type![0] === "poi") {
      if (item.properties?.categories.includes("bus stop")) {
        placeTypeName = "Arrêt de bus";
      }
      if (item.properties?.categories.includes("railway station")) {
        placeTypeName = "Gare";
      }
    }

    if (cityName.endsWith(", France") && item.context.length >= 3) {
      cityName = cityName.substring(0, cityName.length - ", France".length) + ", " + item.context[item.context.length - 3].text;
    }
  }

  return (
    <Row style={{ alignItems: "center" }} spacing={16}>
      {iconName === "rallying-point" ? (
        <View style={styles.rallyingPointStyle}>
          <AppIcon name={iconName} size={24} color={AppColors.white} />
        </View>
      ) : (
        <AppIcon name={iconName} size={28} color={AppColors.primaryColor} />
      )}
      <Column style={{ flex: 1 }}>
        <AppText style={[styles.cityNameStyle, { color, fontSize: labelSize, marginTop: placeName ? 0 : 6 }]}>{cityName}</AppText>
        {placeName && <AppText style={styles.placeNameStyle}>{placeName}</AppText>}
      </Column>
    </Row>
  );
};

export const RallyingPointSuggestions = ({
  currentSearch,
  onSelect,
  exceptValues
}: {
  currentSearch?: string;
  onSelect: (r: RallyingPoint) => void;
  exceptValues?: Ref<RallyingPoint>[];
}) => {
  const [results, setResults] = useState<RallyingPoint[]>([]);
  const { services } = useContext(AppContext);

  const [recentLocations, setRecentLocations] = useState<RallyingPoint[]>([]);

  useEffect(() => {
    services.location.getRecentLocations().then(r => {
      setRecentLocations(r);
    });
  }, [services.location]);

  const debouncedSearch = useDebounceValue(currentSearch);
  const [loading, setLoading] = useState(false);

  const updateValue = async (v: RallyingPoint) => {
    onSelect(v);
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
    const values = results.length > 0 ? results : recentLocations;
    if (exceptValues) {
      return values.filter(l => !exceptValues!.includes(l.id!));
    }
    return values;
  }, [exceptValues, recentLocations, results]);

  return (
    <FlatList
      refreshing={loading}
      style={{ flex: 1 }}
      data={locationList}
      keyExtractor={i => i.id!}
      renderItem={({ item }) => (
        <AppPressableOverlay
          key={item.id!}
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          onPress={async () => {
            await updateValue(item);
          }}>
          <RallyingPointItem item={item} icon="position-on" />
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
      //services.location.search(debouncedSearch, services.location.getLastKnownLocation()).catch(e => console.warn(e));
    }
  }, [debouncedSearch, services.location, services.rallyingPoint]);

  /*const locationList = useMemo(() => {
    if (props.exceptValues) {
      return results.filter(l => !props.exceptValues!.includes(l.id!));
    }
    return results;
  }, [props.exceptValues, results]);*/

  if (loading) {
    return <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />;
  }

  if (error) {
    return <AppText style={[{ padding: 16, color: ContextualColors.redAlert.text }]}>{error}</AppText>;
  }

  if (results.length === 0) {
    return (
      <Center>
        <AppText style={AppStyles.noData}>Aucun résultat</AppText>
      </Center>
    );
  }
  return (
    <FlatList
      style={{ paddingTop: 8 }}
      keyboardShouldPersistTaps="always"
      data={results}
      keyExtractor={(item, index) => (isRallyingPointSearchedLocation(item) ? item.properties!.id! : item.properties!.ref) + index}
      renderItem={({ item, index }) => (
        <AppPressableOverlay
          key={(isRallyingPointSearchedLocation(item) ? item.properties!.id! : item.properties!.ref) + index}
          style={[styles.placeItemStyle, index !== results.length - 1 ? { borderBottomWidth: 1, borderColor: AppColorPalettes.gray[200] } : {}]}
          onPress={() => updateValue(item)}>
          <PlaceItem item={item} labelSize={18} />
        </AppPressableOverlay>
      )}
    />
  );
};

export type Notice = { type: "info" | "error"; message: string } | "loading";

export type ItinerarySearchFormProps = {
  trip: Partial<Itinerary>;
  liane?: Ref<CoLiane>;
  updateTrip: (trip: Partial<Itinerary>) => void;
  title?: string;
  style?: StyleProp<ViewStyle>;
  formWrapperStyle?: StyleProp<ViewStyle>;
  formStyle?: StyleProp<ViewStyle>;
  editable?: boolean;
  onRequestFocus?: (field: "from" | "to") => void;
  notice?: Notice;
};

export const ItinerarySearchForm = ({
  trip: currentTrip,
  updateTrip,
  title,
  liane,
  style,
  formWrapperStyle,
  formStyle,
  editable = true,
  onRequestFocus,
  notice
}: ItinerarySearchFormProps) => {
  const [currentPoint, setCurrentPoint] = useState<ToOrFrom | undefined>("to");
  const [currentSearch, setCurrentSearch] = useState<string>("");
  const [mapOpen, setMapOpen] = useState<ToOrFrom>();

  const otherValue = currentPoint ? currentTrip[currentPoint === "to" ? "from" : "to"] : undefined;

  const handleUpdateField = useCallback(
    (rp: RallyingPoint) => {
      if (!currentPoint) {
        return;
      }
      updateTrip({ [currentPoint]: rp });
      const newPoint = currentPoint === "to" ? (!currentTrip.from ? "from" : undefined) : !currentTrip.to ? "to" : undefined;
      setCurrentPoint(newPoint);
    },
    [currentTrip, currentPoint, updateTrip]
  );

  if (mapOpen) {
    return (
      <AppBackContextProvider
        backHandler={() => {
          setMapOpen(undefined);
          return true;
        }}>
        <SelectOnMapView
          liane={liane}
          onSelect={p => {
            setMapOpen(undefined);
            updateTrip({ [mapOpen]: p });
          }}
          title={"Choisissez un point " + (mapOpen === "from" ? "de départ" : "d'arrivée")}
        />
      </AppBackContextProvider>
    );
  }

  return (
    <Column style={[{ flex: editable ? 1 : undefined }, style]}>
      <ItineraryFormHeader
        title={title}
        editable={editable}
        containerStyle={formWrapperStyle}
        style={formStyle}
        animateEntry={true}
        onRequestFocus={field => {
          setCurrentPoint(field);
          setCurrentSearch("");
          updateTrip({ [field]: undefined });
          onRequestFocus && onRequestFocus(field);
        }}
        onChangeField={(field, v) => {
          setCurrentPoint(field);
          setCurrentSearch(v);
        }}
        trip={currentTrip}
        updateTrip={updateTrip}
      />

      {editable && (
        <>
          {notice && (
            <Row
              style={{
                paddingTop: 16
              }}>
              {notice === "loading" ? (
                <ActivityIndicator style={styles.loader} color={AppColorPalettes.gray[500]} size="small" />
              ) : (
                <AppText
                  style={{
                    fontWeight: "bold",
                    color: notice.type === "info" ? AppColorPalettes.gray[500] : AppColorPalettes.orange[500]
                  }}>
                  {notice.message}
                </AppText>
              )}
            </Row>
          )}
          {currentPoint !== undefined && (
            <>
              <AppPressableOverlay onPress={() => setMapOpen(currentPoint)} style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                <Row spacing={16}>
                  <AppIcon name={"map-outline"} size={22} />
                  <AppText>Choisir sur la carte</AppText>
                </Row>
              </AppPressableOverlay>
              <RallyingPointSuggestions
                currentSearch={currentSearch}
                exceptValues={otherValue ? [otherValue.id!] : undefined}
                onSelect={rp => {
                  handleUpdateField(rp);
                }}
              />
            </>
          )}
        </>
      )}
    </Column>
  );
};

const styles = StyleSheet.create({
  loader: {
    width: "100%"
  },
  page: {
    flex: 1
  },
  bold: {
    fontWeight: "bold"
  },
  placeItemStyle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 20,
    height: 54
  },
  rallyingPointStyle: {
    backgroundColor: AppColors.primaryColor,
    borderRadius: 24,
    padding: 1,
    marginLeft: 2
  },
  cityNameStyle: {
    fontWeight: "bold",
    lineHeight: 18
  },
  placeNameStyle: {
    fontWeight: "bold",
    color: AppColorPalettes.gray[400],
    fontSize: 14,
    marginTop: -2
  }
});
