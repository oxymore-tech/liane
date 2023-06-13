import { LatLng, RallyingPoint } from "@/api";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "@/components/ContextProvider";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import LocationPin from "@/assets/location_pin.svg";
import { RallyingPointInput } from "@/components/RallyingPointInput";
import { Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { MonkeySmilingVector } from "@/components/vectors/MonkeySmilingVector";
import { FormComponent } from "@/screens/lianeWizard/Forms";
import { BaseFormComponentProps, WithFormController } from "@/components/forms/WithFormController";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { MapStyleProps } from "@/api/location";
import { PositionButton } from "@/components/map/PositionButton";
import { useKeyboardState } from "@/util/hooks/keyboardState";

export const LocationForm: FormComponent<RallyingPoint | undefined> = WithFormController(
  ({ value, onChange, fieldState: { error, invalid } }: BaseFormComponentProps<RallyingPoint | undefined>) => {
    const { services } = useContext(AppContext);
    const [position, setCurrentPosition] = useState<LatLng | undefined>(services.location.getLastKnownLocation());
    const [recentLocations, setRecentLocations] = useState<RallyingPoint[]>([]);
    const center = value ? [value.location.lng, value.location.lat] : undefined;
    const cameraRef = useRef<MapLibreGL.Camera>(null);
    const mapRef = useRef<MapLibreGL.MapView>(null);
    // Listen to keyboard state to hide popup
    const keyboardsIsVisible = useKeyboardState();

    useEffect(() => {
      services.location.getRecentLocations().then(r => {
        setRecentLocations(r);
      });
    }, [services]);

    const updateValue = (v: RallyingPoint | undefined) => {
      onChange(v);
      if (v) {
        services.location.cacheRecentLocation(v).then(updated => setRecentLocations(updated));
      }
    };

    const locationButton = useMemo(
      () => (
        <PositionButton
          onPosition={async currentLocation => {
            const closestPoint = await services.rallyingPoint.snap(currentLocation);
            setCurrentPosition(closestPoint.location);
            updateValue(closestPoint);
          }}
        />
      ),
      [services]
    );

    return (
      <Column style={{ flex: 1, padding: 16, width: "100%" }} spacing={8}>
        <RallyingPointInput placeholder="Chercher une adresse" onChange={updateValue} value={value} trailing={locationButton} />
        {!value && !keyboardsIsVisible && (
          <View
            style={{
              flex: 1,
              flexGrow: 1,
              zIndex: -1,
              backgroundColor: WithAlpha(AppColors.white, 0.6),
              width: "100%",
              borderRadius: 16,
              paddingVertical: 12
            }}>
            <AppText style={[styles.bold, { paddingHorizontal: 16 }]}>Recherches récentes</AppText>
            <FlatList
              style={{ flex: 1, paddingVertical: 4 }}
              data={recentLocations}
              keyExtractor={r => r.id!}
              renderItem={({ item }) => (
                <AppPressableOverlay key={item.id!} style={{ paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => updateValue(item)}>
                  <Column>
                    <AppText style={[styles.bold, { flex: 1 }]}>{item.label}</AppText>
                    <AppText numberOfLines={1}>{item.address}</AppText>
                    <AppText numberOfLines={1}>{item.zipCode + ", " + item.city}</AppText>
                  </Column>
                </AppPressableOverlay>
              )}
            />
          </View>
        )}
        {!keyboardsIsVisible && invalid && (
          <Row
            spacing={16}
            style={{
              backgroundColor: AppColors.white,
              borderRadius: 16,
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 8
            }}>
            <AppIcon name="alert-triangle" animation="shake" color="darkred" size={40} />
            <AppText numberOfLines={2} style={{ color: "darkred", flex: 1 }}>
              {error!.message || "Veuillez sélectionner un point de ralliement."}
            </AppText>
          </Row>
        )}
        {value && (
          <View
            style={{
              flex: keyboardsIsVisible ? 0 : 1,
              backgroundColor: AppColorPalettes.gray[400],
              width: "100%",
              borderRadius: 16,
              overflow: "hidden"
            }}>
            <MapLibreGL.MapView
              ref={mapRef}
              style={{ backfaceVisibility: "hidden", flex: 1, width: "100%" }}
              {...MapStyleProps}
              logoEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              scrollEnabled={false}
              attributionEnabled={false}>
              <MapLibreGL.Camera
                ref={cameraRef}
                maxZoomLevel={15}
                minZoomLevel={5}
                zoomLevel={11}
                animationMode={"moveTo"}
                centerCoordinate={center || (position && [position.lng, position.lat])}
                padding={{ paddingBottom: value ? 100 : 0 }}
              />

              <MapLibreGL.MarkerView coordinate={[value.location.lng, value.location.lat]} id={value.id!} key={value.id!}>
                <LocationPin fill={AppColorPalettes.orange[700]} />
              </MapLibreGL.MarkerView>
            </MapLibreGL.MapView>

            {!keyboardsIsVisible && !invalid && (
              <Row
                spacing={16}
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: 24,
                  right: 24,
                  backgroundColor: AppColors.white,
                  borderRadius: 16,
                  height: 80,
                  alignItems: "center",
                  padding: 16
                }}>
                <Pressable
                  onPress={() => {
                    if (center) {
                      cameraRef.current?.flyTo(center);
                    }
                  }}>
                  <LocationPin fill={AppColorPalettes.orange[700]} />
                </Pressable>
                <Column>
                  <AppText style={styles.bold}>{value.label}</AppText>
                  <AppText numberOfLines={1}>{value.address}</AppText>
                  <AppText numberOfLines={1}>{value.zipCode + ", " + value.city}</AppText>
                </Column>
                <View style={{ position: "absolute", top: -60, right: 8, flexGrow: 1, alignItems: "flex-end", paddingRight: 16 }}>
                  <MonkeySmilingVector maxWidth={80} />
                </View>
              </Row>
            )}
          </View>
        )}
      </Column>
    );
  }
);

const styles = StyleSheet.create({
  bold: {
    fontWeight: "bold"
  }
});
