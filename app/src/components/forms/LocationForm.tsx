import { LatLng, RallyingPoint } from "@/api";
import React, { useContext, useMemo, useRef, useState } from "react";
import { AppContext } from "@/components/ContextProvider";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { useKeyboardState } from "@/util/hooks/keyboardState";
import { Pressable, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { MapStyle } from "@/api/location";
import LocationPin from "@/assets/location_pin.svg";
import { RallyingPointInput } from "@/components/RallyingPointInput";
import { Column, Row } from "@/components/base/AppLayout";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { MonkeySmilingVector } from "@/components/vectors/MonkeySmilingVector";
import { FormComponent } from "@/screens/lianeWizard/Forms";
import { BaseFormComponentProps, WithFormController } from "@/components/forms/WithFormController";

export const LocationForm: FormComponent<RallyingPoint | undefined> = WithFormController(
  ({ value, onChange, fieldState: { error, invalid } }: BaseFormComponentProps<RallyingPoint | undefined>) => {
    const { services } = useContext(AppContext);
    const [position, setCurrentPosition] = useState<LatLng | undefined>(services.location.getLastKnownLocation());
    const center = value ? [value.location.lng, value.location.lat] : undefined;
    const cameraRef = useRef<MapLibreGL.Camera>(null);
    const mapRef = useRef<MapLibreGL.MapView>(null);
    // Listen to keyboard state to hide popup
    const keyboardsIsVisible = useKeyboardState();

    //   const [displayedRallyingPoints, setDisplayedRallyingPoints] = useState<RallyingPoint[]>([]);
    const onRegionChange = async c => {
      // TODO cache or use timeout
      console.log(c, await mapRef.current?.getVisibleBounds());
      //const rallyingPoints = await services.rallyingPoint.search("", { lng: c.geometry.coordinates[0], lat: c.geometry.coordinates[1] });
      //   setDisplayedRallyingPoints(rallyingPoints);
    };

    const locationButton = useMemo(
      () => (
        <Pressable
          style={{ height: "100%", width: 36, justifyContent: "center", alignItems: "center" }}
          onPress={async () => {
            try {
              const currentLocation = await services.location.currentLocation();
              if (__DEV__) {
                console.log(currentLocation);
              }
              const closestPoint = await services.rallyingPoint.snap(currentLocation);
              setCurrentPosition(closestPoint.location);
              onChange(closestPoint);
            } catch (e) {
              console.error("location error :", e);
              // TODO show message to user
            }
          }}>
          <AppCustomIcon name={"position"} color={AppColors.blue} />
        </Pressable>
      ),
      [services]
    );

    return (
      <View style={{ flex: 1, backgroundColor: AppColorPalettes.gray[400], width: "100%", borderRadius: 16, overflow: "hidden" }}>
        <View>
          <MapLibreGL.MapView
            ref={mapRef}
            style={{ backfaceVisibility: "hidden", flex: 1, width: "100%" }}
            styleJSON={MapStyle}
            logoEnabled={false}
            attributionEnabled={false}
            onRegionDidChange={onRegionChange}>
            <MapLibreGL.Camera
              ref={cameraRef}
              maxZoomLevel={15}
              minZoomLevel={5}
              zoomLevel={11}
              animationMode={"moveTo"}
              centerCoordinate={center || (position && [position.lng, position.lat])}
              padding={{ paddingBottom: value ? 100 : 0 }}
            />

            {value && (
              <MapLibreGL.MarkerView coordinate={[value.location.lng, value.location.lat]} id={value.id!}>
                <LocationPin fill={AppColorPalettes.orange[700]} />
              </MapLibreGL.MarkerView>
            )}
          </MapLibreGL.MapView>
        </View>
        <View style={{ position: "absolute", top: 16, left: 24, right: 24 }}>
          <RallyingPointInput placeholder="Chercher une adresse" onChange={onChange} value={value} trailing={locationButton} />
        </View>
        {!keyboardsIsVisible && invalid && (
          <Row
            spacing={16}
            style={{
              position: "absolute",
              bottom: 16,
              left: 24,
              right: 24,
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
        {!keyboardsIsVisible && value && !invalid && (
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
                cameraRef.current?.flyTo(center);
              }}>
              <LocationPin fill={AppColorPalettes.orange[700]} />
            </Pressable>
            <Column>
              <AppText style={{ fontWeight: "bold" }}>{value.label}</AppText>
              <AppText numberOfLines={1}>{value.address}</AppText>
              <AppText numberOfLines={1}>{value.zipCode + ", " + value.city}</AppText>
            </Column>
            <View style={{ position: "absolute", top: -60, right: 8, flexGrow: 1, alignItems: "flex-end", paddingRight: 16 }}>
              <MonkeySmilingVector maxWidth={80} />
            </View>
          </Row>
        )}
      </View>
    );
  }
);
