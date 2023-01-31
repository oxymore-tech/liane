import { Switch, View } from "react-native";
import React, { useContext, useEffect } from "react";
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
import MapboxGL from "@rnmapbox/maps";
import { MapStyle } from "@/api/location";
import LocationPin from "@/assets/location_pin.svg";
import { MonkeySmilingVector } from "@/components/vectors/MonkeySmilingVector";
import { AppContext } from "@/components/ContextProvider";

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
    return (
      <View style={{ flex: 1, backgroundColor: AppColorPalettes.gray[400], width: "100%", borderRadius: 16, overflow: "hidden" }}>
        <MapboxGL.MapView
          style={{ backfaceVisibility: "hidden", flex: 1, width: "100%" }}
          styleJSON={MapStyle}
          logoEnabled={false}
          attributionEnabled={false}>
          <MapboxGL.Camera
            maxZoomLevel={15}
            minZoomLevel={5}
            zoomLevel={8}
            animationMode={"none"}
            centerCoordinate={center || (position && [position.lng, position.lat])}
            padding={{ paddingBottom: value ? 100 : 0 }}
          />
          {value && (
            <MapboxGL.MarkerView coordinate={center}>
              <LocationPin fill={AppColorPalettes.orange[700]} />
            </MapboxGL.MarkerView>
          )}
        </MapboxGL.MapView>
        <View style={{ position: "absolute", top: 24, left: 24, right: 24 }}>
          <RallyingPointInput placeholder="Chercher une adresse" onChange={onChange} value={value} />
        </View>
        {invalid && (
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
        {value && (
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
            <LocationPin fill={AppColorPalettes.orange[700]} />
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
      thumbColor={value ? AppColorPalettes.blue[400] : AppColorPalettes.gray[100]}
      ios_backgroundColor={AppColorPalettes.gray[500]}
      onValueChange={onChange}
      value={value}
    />
    <AppText>Se rappeler de mon choix</AppText>
  </Row>
));

export const CarForm: FormComponent<number> = WithFormContext(({ value, onChange }: InternalBaseFormProps<number>) => {
  return (
    <Column spacing={64} style={{ justifyItems: "space-between" }}>
      <AppSwitchToggle
        defaultSelectedValue={value > 0}
        options={[true, false]}
        selectionColor={AppColorPalettes.blue[700]}
        onSelectValue={selection => {
          onChange(selection ? 1 : 0);
        }}
      />

      {value > 0 && (
        <Column style={{ alignItems: "center" }} spacing={8}>
          <AppText>Places disponibles</AppText>
          <Row style={{ alignItems: "center" }}>
            <AppButton kind="circular" color={AppColorPalettes.blue[500]} icon="minus-outline" onPress={() => onChange(Math.max(1, value - 1))} />
            <AppText style={{ fontSize: 40 }}>{value}</AppText>
            <AppIcon name="people-outline" size={40} />
            <AppButton kind="circular" color={AppColorPalettes.blue[500]} icon="plus-outline" onPress={() => onChange(value + 1)} />
          </Row>
        </Column>
      )}
    </Column>
  );
});
