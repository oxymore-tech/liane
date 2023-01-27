import { Switch } from "react-native";
import React from "react";
import DatePicker from "react-native-date-picker";
import { ControllerFieldState, useController } from "react-hook-form";
import { AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { RallyingPointInput } from "@/components/RallyingPointInput";
import { RallyingPoint } from "@/api";
import { Column, Row } from "@/components/base/AppLayout";
import { AppSwitchToggle } from "@/components/base/AppOptionToggle";
import { AppButton } from "@/components/base/AppButton";
import { AppIcon } from "@/components/base/AppIcon";
import { LianeWizardFormKey } from "@/screens/lianeWizard/LianeWizardFormData";
import { TimeInSeconds, toTimeInSeconds } from "@/util/datetime";

export interface BaseFormProps<T> {
  name: LianeWizardFormKey;
  defaultValue?: T;
  rules?: { required?: boolean; validate?: (value: T, formValues) => boolean };
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

    return <WrappedForm value={field.value} onChange={field.onChange} fieldState={fieldState} />;
  };

export const DateForm: FormComponent<Date> = WithFormContext(({ value, onChange }: InternalBaseFormProps<Date>) => (
  <DatePicker mode="date" date={value || new Date()} onDateChange={onChange} fadeToColor="none" textColor={AppColors.black} />
));

export const TimeForm: FormComponent<TimeInSeconds> = WithFormContext(({ value, onChange }: InternalBaseFormProps<TimeInSeconds>) => (
  <DatePicker
    mode="time"
    date={new Date((value || 1) * 1000)}
    onDateChange={date => onChange(toTimeInSeconds(date))}
    fadeToColor="none"
    textColor={AppColors.black}
  />
));

/*

          <View
            style={{
              width: 300,
              maxHeight: 200,
              display: "flex",
            }}>
            {value && (
              <MapLibreGL.MapView
                style={{flex: 1}}
                styleJSON={MapStyle}
                logoEnabled={false}
                attributionEnabled={false}>
                <MapLibreGL.Camera
                  maxZoomLevel={15}
                  minZoomLevel={5}
                  zoomLevel={8}
                  centerCoordinate={[value.location.lng, value.location.lat]}
                />
              </MapLibreGL.MapView>
            )}
            {(!value || error) && (
              <View
                style={{
                  flex: 1,
                  backgroundColor: AppColors.gray200,
                  justifyContent: "center",
                  alignItems: "center",
                }}>
                <AppText>{error?.message}</AppText>
              </View>
            )}
          </View>
 */
export const LocationForm: FormComponent<RallyingPoint | undefined> = WithFormContext(
  ({ value, onChange, fieldState: { error, invalid } }: InternalBaseFormProps<RallyingPoint | undefined>) => {
    //console.log(value, error, invalid);
    return <RallyingPointInput placeholder="Chercher un lieu" onChange={onChange} value={value} />;
  }
);

export const RememberChoiceForm: FormComponent<boolean> = WithFormContext(({ value, onChange }: InternalBaseFormProps<boolean>) => (
  <Row style={{ alignItems: "center" }} spacing={8}>
    <Switch
      trackColor={{ false: AppColors.gray400, true: AppColors.blue700 }}
      thumbColor={value ? AppColors.blue400 : AppColors.gray100}
      ios_backgroundColor={AppColors.gray500}
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
        selectionColor={AppColors.blue700}
        onSelectValue={selection => {
          onChange(selection ? 1 : 0);
        }}
      />

      {value > 0 && (
        <Column style={{ alignItems: "center" }} spacing={8}>
          <AppText>Places disponibles</AppText>
          <Row style={{ alignItems: "center" }}>
            <AppButton kind="circular" color={AppColors.blue500} icon="minus-outline" onPress={() => onChange(Math.max(1, value - 1))} />
            <AppText style={{ fontSize: 40 }}>{value}</AppText>
            <AppIcon name="people-outline" size={40} />
            <AppButton kind="circular" color={AppColors.blue500} icon="plus-outline" onPress={() => onChange(value + 1)} />
          </Row>
        </Column>
      )}
    </Column>
  );
});
