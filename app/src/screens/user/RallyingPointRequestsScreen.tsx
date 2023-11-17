import * as React from "react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { FormProvider, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { Center, Column, Space } from "@/components/base/AppLayout";
import {
  LatLng,
  LocationService,
  RallyingPoint,
  RallyingPointLocationLabels,
  RallyingPointLocationTypes,
  RallyingPointPropertiesLabels,
  RallyingPointRequest,
  toLatLng
} from "@liane/common";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/base/AppIcon";
import { PageHeader } from "@/components/context/Navigation";
import { useAppNavigation } from "@/components/context/routing";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppStyles } from "@/theme/styles";
import AppMapView, { AppMapViewController } from "@/components/map/AppMapView";
import Animated, { SlideInUp, SlideOutUp, ZoomIn, ZoomOut } from "react-native-reanimated";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay";
import { Position } from "geojson";
import { AppContext } from "@/components/context/ContextProvider";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { TextField } from "@/components/forms/fields/TextField";
import { OptionDropdownField } from "@/components/forms/fields/OptionField";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { AppLogger } from "@/api/logger";
import { AppText } from "@/components/base/AppText";

export function RallyingPointRequestsScreen() {
  // TODO show the list of pending requests here and a (+) button for new requests
  return <NewRallyingPointRequestScreen />;
}

type FormValues = { comment?: string; point: Partial<RallyingPointRequest["point"]> };

async function generateRallyingPoint(locationService: LocationService, location: LatLng): Promise<FormValues> {
  const results = await locationService.name(location);

  if (results.features.length === 0) {
    return { point: { location } };
  }
  const f = results.features[0];
  return {
    point: {
      location,
      label: f.text_fr === "-" ? undefined : f.text_fr,
      address: f.context.find(v => v.id.startsWith("address."))?.text_fr,
      city: f.context.find(v => v.id.startsWith("municipality."))?.text_fr,
      zipCode: f.context.find(v => v.id.startsWith("postal_code."))?.text_fr
    }
  };
}

const locationTypes = RallyingPointLocationTypes.map(v => ({ key: v, label: RallyingPointLocationLabels[v] }));
export function NewRallyingPointRequestScreen() {
  const methods = useForm<FormValues>({ mode: "onChange" });

  const { setValue, watch, reset, formState, handleSubmit } = methods;
  const { services } = useContext(AppContext);
  const { navigation } = useAppNavigation();
  const [hasError, setError] = useState<any>();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const onSubmit: SubmitHandler<FormValues> = async data => {
    console.log("xc");
    AppLogger.debug("RALLYING_POINT", "Submitting...");
    setLoading(true);
    try {
      await services.rallyingPoint.postRequest({
        point: data.point as RallyingPointRequest["point"],
        comment: data.comment ?? ""
      });
      setShowConfirmation(true);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  const onError: SubmitErrorHandler<FormValues> = errors => {
    return AppLogger.debug("RALLYING_POINT", errors);
  };
  const { bottom: paddingBottom, top: paddingTop } = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");

  const [loading, setLoading] = useState(false);

  const mapRef = useRef<AppMapViewController>(null);
  const inputRef = useRef<TextInput>(null);

  const selectLocation = useCallback(
    async (p: Position) => {
      inputRef.current?.blur();
      const location = toLatLng(p);

      reset();
      setValue("point.location", location);
      setLoading(true);
      const v = await generateRallyingPoint(services.location, location);
      Object.entries(v).forEach(([name, value]: any) => setValue(name, value));
      setLoading(false);
    },
    [reset, services.location, setValue]
  );
  const location = watch("point.location") as LatLng | undefined;

  useEffect(() => {
    if (location) {
      mapRef.current?.setCenter(location, 14);
    }
  }, [mapRef, location]);

  if (showConfirmation) {
    return (
      <Column style={{ flex: 1, paddingHorizontal: 24, alignItems: "center", paddingTop, paddingBottom }}>
        <AppIcon name={"checkmark-circle-2"} color={AppColors.primaryColor} size={120} />
        <AppText style={{ fontSize: 24, fontWeight: "bold", textAlign: "center", marginVertical: 8 }}>Requête envoyée !</AppText>

        <AppText numberOfLines={5} style={{ alignSelf: "center", textAlign: "center", fontSize: 18 }}>
          Merci de contribuer au développement de Liane sur votre territoire. Votre soumission va être étudiée très prochainement par nos équipes.
        </AppText>
        <Space />
        <View style={{ alignSelf: "stretch" }}>
          <AppRoundedButton
            color={defaultTextColor(AppColors.primaryColor)}
            onPress={() => navigation.goBack()}
            backgroundColor={AppColors.primaryColor}
            text={"Terminer"}
          />
        </View>
      </Column>
    );
  }

  return (
    <FormProvider {...methods}>
      <PageHeader title={"Proposer un point de ralliement"} navigation={navigation} />
      <View style={{ flex: 1, maxHeight: !location ? undefined : 152 }}>
        <AppMapView showGeolocation={"top"} ref={mapRef} onPress={!location ? undefined : () => setValue("point.location", undefined)}>
          {location && (
            <Animated.View entering={ZoomIn} exiting={ZoomOut}>
              <WayPointDisplay rallyingPoint={{ location, id: "selected" } as RallyingPoint} type={"from"} size={24} offsetY={-24} />
            </Animated.View>
          )}
        </AppMapView>
        {false && !location && (
          <Animated.View
            style={[styles.inputContainer, { position: "absolute", left: 0, right: 0, top: 8 }]}
            entering={SlideInUp}
            exiting={SlideOutUp}>
            <AppTextInput
              ref={inputRef}
              trailing={
                inputText.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      setInputText("");
                    }}>
                    <AppIcon name={"close-outline"} color={AppColorPalettes.gray[800]} />
                  </Pressable>
                ) : undefined
              }
              value={inputText}
              onChangeText={setInputText}
              placeholder={"Chercher une adresse..."}
              placeholderTextColor={AppColorPalettes.gray[500]}
              textColor={AppColorPalettes.gray[800]}
              style={AppStyles.input}
              leading={<AppIcon name={"search-outline"} color={AppColors.primaryColor} />}
            />
          </Animated.View>
        )}
        {!location && (
          <View style={[styles.footerContainer, { paddingBottom }]}>
            {!loading && (
              <AppRoundedButton
                flex={2}
                backgroundColor={AppColors.primaryColor}
                text={"Choisir cet emplacement"}
                onPress={async () => {
                  const center = await mapRef.current?.getCenter();
                  if (!center) {
                    return;
                  }
                  await selectLocation(center);
                }}
              />
            )}
          </View>
        )}
        {!location && (
          <Center style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none">
            <View>
              <AppIcon name={"position-on"} color={AppColors.primaryColor} size={32} style={[AppStyles.shadow]} />
              <Center
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0
                }}>
                <View
                  style={{
                    borderRadius: 8,
                    height: 8,
                    width: 8,
                    backgroundColor: AppColors.primaryColor
                  }}
                />
              </Center>
            </View>
          </Center>
        )}
      </View>

      {location && (!loading || formState.isSubmitting) && (
        <Column style={{ flex: 1 }}>
          <KeyboardAwareScrollView style={{ flex: 1, flexGrow: 1 }}>
            <Column style={{ paddingHorizontal: 16, paddingVertical: 8 }} spacing={4}>
              <TextField name={"point.label"} label={RallyingPointPropertiesLabels.label} minLength={2} />
              <OptionDropdownField label={RallyingPointPropertiesLabels.type} name={"point.type"} options={locationTypes} defaultIndex={undefined} />
              <TextField name={"point.address"} label={RallyingPointPropertiesLabels.address} />
              <TextField name={"point.zipCode"} label={RallyingPointPropertiesLabels.zipCode} />
              <TextField name={"point.city"} label={RallyingPointPropertiesLabels.city} />
              <TextField name={"point.placeCount"} label={RallyingPointPropertiesLabels.placeCount!} required={false} keyboardType={"numeric"} />
              <TextField name={"comment"} label={"Description"} expandable={true} required={false} placeholder={"Ajouter une description..."} />
            </Column>
          </KeyboardAwareScrollView>
          <View style={{ backgroundColor: AppColors.white, paddingBottom, paddingHorizontal: 16, paddingTop: 8 }}>
            {loading && (
              <Center>
                <ActivityIndicator />
              </Center>
            )}
            {!loading && (
              <AppRoundedButton
                enabled={formState.isValid}
                color={defaultTextColor(AppColors.primaryColor)}
                onPress={handleSubmit(onSubmit, onError)}
                backgroundColor={AppColors.primaryColor}
                text={hasError ? "Réessayer" : "Envoyer"}
              />
            )}
          </View>
        </Column>
      )}
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    borderRadius: 18,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: AppColors.white,
    height: 50,
    backgroundColor: AppColors.white,
    borderWidth: 1,
    borderColor: AppColorPalettes.gray[200]
  },
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 24
  }
});
