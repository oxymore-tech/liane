import { Pressable, Switch, View } from "react-native";
import React, { useContext, useEffect, useRef } from "react";
import DatePicker from "react-native-date-picker";
import { ControllerFieldState, useController } from "react-hook-form";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { RallyingPointInput } from "@/components/RallyingPointInput";
import { RallyingPoint } from "@/api";
import { Column, Row } from "@/components/base/AppLayout";
import { AppSwitchToggle } from "@/components/base/AppOptionToggle";
import { AppButton } from "@/components/base/AppButton";
import { AppIcon } from "@/components/base/AppIcon";
import { LianeWizardFormKey } from "@/screens/lianeWizard/LianeWizardFormData";
import { TimeInSeconds, toTimeInSeconds } from "@/util/datetime";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { MapStyle } from "@/api/location";
import LocationPin from "@/assets/location_pin.svg";
import { MonkeySmilingVector } from "@/components/vectors/MonkeySmilingVector";
import { AppContext } from "@/components/ContextProvider";
import { useKeyboardState } from "@/components/utils/KeyboardStateHook";

export interface BaseFormProps<T> {
  name: LianeWizardFormKey;
  defaultValue?: T;
  rules?: { required?: boolean; validate?: (value: T, formValues: unknown) => boolean };
}

interface InternalBaseFormProps<T> {
  value: T;
  onChange: (value: T) => void;
  fieldState: ControllerFieldState;
}

export type FormComponent<T> = (props: BaseFormProps<T>) => JSX.Element;
type InternalFormComponent<T> = (props: InternalBaseFormProps<T>) => JSX.Element;
const WithFormContext =
  <T extends unknown>(WrappedForm: InternalFormComponent<T>) =>
  ({ name, rules, ...props }: BaseFormProps<T>) => {
    let rulesWithDefaults = rules || { required: true };
    if (rulesWithDefaults.required === undefined) {
      rulesWithDefaults.required = true;
    }
    const { field, fieldState } = useController({
      name,
      rules: rulesWithDefaults,
      ...props
    });
    if (fieldState.invalid) {
      console.log("INVALID", field.name, fieldState.error);
    }
    return <WrappedForm value={field.value} onChange={field.onChange} fieldState={fieldState} />;
  };

export const DateForm: FormComponent<Date> = WithFormContext(({ value, onChange }: InternalBaseFormProps<Date>) => {
  if (!value) {
    useEffect(() => {
      onChange(new Date());
    });
  }
  return (
    <View style={{ backgroundColor: WithAlpha(AppColors.white, 0.4), borderRadius: 16, marginVertical: 16 }}>
      <DatePicker
        mode="date"
        date={value || new Date()}
        onDateChange={onChange}
        fadeToColor="none"
        textColor={AppColors.black}
        minimumDate={new Date()}
      />
    </View>
  );
});

export const TimeForm: FormComponent<TimeInSeconds> = WithFormContext(({ value, onChange }: InternalBaseFormProps<TimeInSeconds>) => {
  if (!value) {
    useEffect(() => {
      onChange(toTimeInSeconds(new Date()));
    });
  }
  return (
    <View style={{ backgroundColor: WithAlpha(AppColors.white, 0.4), borderRadius: 16, marginVertical: 16 }}>
      <DatePicker
        mode="time"
        date={value ? new Date(value * 1000) : new Date()}
        onDateChange={date => onChange(toTimeInSeconds(date))}
        fadeToColor="none"
        textColor={AppColors.black}
      />
    </View>
  );
});

export const LocationForm: FormComponent<RallyingPoint | undefined> = WithFormContext(
  ({ value, onChange, fieldState: { error, invalid } }: InternalBaseFormProps<RallyingPoint | undefined>) => {
    const { position } = useContext(AppContext);
    const center = value ? [value.location.lng, value.location.lat] : undefined;
    const cameraRef = useRef<MapLibreGL.Camera>(null);
    // Listen to keyboard state to hide backdrop when keyboard is visible
    const keyboardsIsVisible = useKeyboardState();

    return (
      <View style={{ flex: 1, backgroundColor: AppColorPalettes.gray[400], width: "100%", borderRadius: 16, overflow: "hidden" }}>
        <MapLibreGL.MapView
          style={{ backfaceVisibility: "hidden", flex: 1, width: "100%" }}
          styleJSON={MapStyle}
          logoEnabled={false}
          attributionEnabled={false}>
          <MapLibreGL.Camera
            ref={cameraRef}
            maxZoomLevel={15}
            minZoomLevel={5}
            zoomLevel={8}
            animationMode={"moveTo"}
            centerCoordinate={center || (position && [position.lng, position.lat])}
            padding={{ paddingBottom: value ? 100 : 0 }}
          />
          {value && (
            <MapLibreGL.MarkerView coordinate={center}>
              <LocationPin fill={AppColorPalettes.orange[700]} />
            </MapLibreGL.MarkerView>
          )}
        </MapLibreGL.MapView>
        <View style={{ position: "absolute", top: 16, left: 24, right: 24 }}>
          <RallyingPointInput placeholder="Chercher une adresse" onChange={onChange} value={value} />
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
              Veuillez sélectionner un point de ralliement.
            </AppText>
          </Row>
        )}
        {!keyboardsIsVisible && value && (
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
              <AppText style={{ fontWeight: "600" }}>{value.label}</AppText>
              <AppText>1 rue de Adresse</AppText>
              <AppText>Ville</AppText>
            </Column>
            <View style={{ position: "relative", top: -52, flexGrow: 1, alignItems: "flex-end", paddingRight: 16 }}>
              <MonkeySmilingVector maxWidth={80} />
            </View>
          </Row>
        )}
      </View>
    );
  }
);

export const RememberChoiceForm: FormComponent<boolean> = WithFormContext(({ value, onChange }: InternalBaseFormProps<boolean>) => (
  <Row style={{ alignItems: "center" }} spacing={8}>
    <Switch
      trackColor={{ false: AppColorPalettes.gray[400], true: AppColorPalettes.blue[700] }}
      thumbColor={AppColorPalettes.gray[100]}
      ios_backgroundColor={AppColorPalettes.gray[500]}
      onValueChange={onChange}
      value={value}
    />
    <AppText>Se rappeler de mon choix</AppText>
  </Row>
));

export const CarForm: FormComponent<number> = WithFormContext(({ value, onChange }: InternalBaseFormProps<number>) => {
  return (
    <Column spacing={32} style={{ justifyItems: "space-between", alignItems: "center", paddingVertical: 16 }}>
      <AppSwitchToggle
        defaultSelectedValue={value > 0}
        options={[false, true]}
        selectionColor={AppColorPalettes.blue[500]}
        onSelectValue={selection => {
          onChange(selection ? 1 : 0);
        }}
      />

      {value > 0 /*(
        <Column style={{ alignItems: "center" }} spacing={8}>
          <AppText>Places disponibles</AppText>
          <Row style={{ alignItems: "center" }}>
            <AppButton kind="circular" color={AppColorPalettes.blue[500]} icon="minus-outline" onPress={() => onChange(Math.max(1, value - 1))} />
            <AppText style={{ fontSize: 40 }}>{value}</AppText>
            <AppIcon name="people-outline" size={40} />
            <AppButton kind="circular" color={AppColorPalettes.blue[500]} icon="plus-outline" onPress={() => onChange(value + 1)} />
          </Row>
        </Column>
      )*/ && (
        <Column>
          <View style={{ position: "relative", top: 10, left: 32, alignItems: "stretch" }}>
            <MonkeySmilingVector maxWidth={80} bodyColor={AppColorPalettes.blue[100]} />
          </View>
          <Column
            spacing={8}
            style={{
              backgroundColor: AppColorPalettes.blue[100],
              borderRadius: 16,
              maxHeight: 110,
              alignItems: "center",
              padding: 16,
              marginHorizontal: 16,
              flex: 1
            }}>
            <AppText style={{ fontSize: 16 }}>Combien de personnes voyagent ?</AppText>
            <Row style={{ alignItems: "center" }} spacing={16}>
              <AppButton kind="circular" color={AppColorPalettes.blue[400]} icon="minus-outline" onPress={() => onChange(Math.max(1, value - 1))} />
              <Row
                spacing={4}
                style={{ backgroundColor: WithAlpha(AppColors.black, 0.1), paddingVertical: 8, paddingHorizontal: 16, borderRadius: 24 }}>
                <AppText style={{ fontSize: 24, minWidth: 20 }}>{value}</AppText>
                <AppIcon name="people-outline" size={24} />
              </Row>
              <AppButton kind="circular" color={AppColorPalettes.blue[500]} icon="plus-outline" onPress={() => onChange(value + 1)} />
            </Row>
          </Column>
        </Column>
      )}
    </Column>
  );
});
