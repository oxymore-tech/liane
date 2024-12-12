import { Column, Row } from "@/components/base/AppLayout";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ColorValue, FlatList, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { AppText } from "@/components/base/AppText";
import { CoLiane, Itinerary, RallyingPoint, Ref } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppColorPalettes } from "@/theme/colors";
import { ItineraryFormHeader, ToOrFrom } from "@/components/trip/ItineraryFormHeader";
import { useDebounceValue } from "@/util/hooks/debounce";
import { AppBackContextProvider } from "@/components/AppBackContextProvider.tsx";
import { SelectOnMapView } from "@/screens/publish/SelectOnMapView.tsx";

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
  }
});
