import { StyleSheet, Switch, View } from "react-native";
import React, { useContext, useEffect, useState } from "react";
import DatePicker from "react-native-date-picker";
import { ControllerFieldState, useController, useFormContext, useWatch } from "react-hook-form";
import { AppColorPalettes, AppColors, defaultTextColor, WithAlpha } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { Column, Row } from "@/components/base/AppLayout";
import { AppSwitchToggle } from "@/components/base/AppOptionToggle";
import { AppButton } from "@/components/base/AppButton";
import { AppIcon } from "@/components/base/AppIcon";
import { LianeWizardFormKey } from "@/screens/lianeWizard/LianeWizardFormData";
import { TimeInSeconds, toTimeInSeconds } from "@/util/datetime";
import { MonkeySmilingVector } from "@/components/vectors/MonkeySmilingVector";
import { WizardFormData, WizardFormDataKey } from "@/screens/lianeWizard/WizardContext";
import { AppDimensions } from "@/theme/dimensions";
import { BaseFormComponentProps, WithFormController } from "@/components/forms/WithFormController";
import { TimeView } from "@/components/TimeView";
import { AppContext } from "@/components/ContextProvider";

export interface BaseFormProps<T> {
  name: LianeWizardFormKey;
  defaultValue?: T;
  rules?: { required?: boolean; validate?: (value: T, formValues: any) => string | boolean };
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
    // eslint-disable-next-line react-hooks/rules-of-hooks
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

export const DurationEstimate = () => {
  const { getValues } = useFormContext();
  const { services } = useContext(AppContext);
  const [duration, setDuration] = useState<number>();
  const departureTime = useWatch({ name: "departureTime" }) ?? getValues("departureTime");
  useEffect(() => {
    const from = getValues("from");
    const to = getValues("to");
    services.routing.duration(from, to).then(d => {
      setDuration(d);
    });
  }, [getValues, services]);

  return duration && departureTime ? (
    <Row style={{ alignItems: "center", padding: 16, alignSelf: "center" }} spacing={8}>
      <AppIcon name={"clock-outline"} size={18} />
      <AppText>
        Arrivée estimée à <TimeView value={departureTime + duration} />
      </AppText>
    </Row>
  ) : (
    <View />
  );
};

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
      <DurationEstimate />
    </View>
  );
});

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

export const CarForm: FormComponent<number> = WithFormController(({ value, onChange }: BaseFormComponentProps<number>) => {
  //TODO change
  //TODO redo layout
  return (
    <Column spacing={32} style={{ justifyItems: "space-between", alignItems: "center", paddingVertical: 16 }}>
      <AppSwitchToggle
        defaultSelectedValue={value > 0}
        options={[false, true]}
        selectionColor={AppColorPalettes.blue[500]}
        onSelectValue={_ => {
          onChange(-value);
        }}
      />

      <Column style={{ alignSelf: "stretch" }}>
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
          <AppText style={{ fontSize: 16 }}>{value > 0 ? "Combien de places avez-vous ?" : "Combien de personnes voyagent ?"}</AppText>
          <Row style={{ alignItems: "center" }} spacing={16}>
            <AppButton
              kind="circular"
              color={AppColorPalettes.blue[400]}
              icon="minus-outline"
              onPress={() => {
                onChange(Math.sign(value) * Math.max(1, Math.abs(value) - 1));
              }}
            />
            <Row
              spacing={4}
              style={{ backgroundColor: WithAlpha(AppColors.black, 0.1), paddingVertical: 8, paddingHorizontal: 16, borderRadius: 24 }}>
              <AppText style={{ fontSize: 24, minWidth: 20 }}>{Math.abs(value)}</AppText>
              <AppIcon name="people-outline" size={24} />
            </Row>
            <AppButton
              kind="circular"
              color={AppColorPalettes.blue[500]}
              icon="plus-outline"
              onPress={() => {
                onChange(Math.sign(value) * Math.min(8, Math.abs(value) + 1));
                //TODO set a maximum value
              }}
            />
          </Row>
        </Column>
      </Column>
    </Column>
  );
});

export const WithForms = (key: WizardFormDataKey) => {
  const { title, forms, color } = WizardFormData[key];

  return (
    <Column style={styles.containerModal} spacing={16}>
      <AppText style={[styles.titleModal, { color: defaultTextColor(color) }]}>{title}</AppText>
      <Column style={styles.formContainer} spacing={16}>
        {forms.map((Form, index) => (
          <Form key={`${key}.field${index}`} />
        ))}
      </Column>
    </Column>
  );
};

const styles = StyleSheet.create({
  containerModal: {
    padding: 4,
    alignItems: "center",
    flex: 1
  },
  formContainer: {
    alignItems: "center",
    flex: 1,
    width: "100%",
    marginBottom: 60,
    justifyContent: "space-between"
  },
  titleModal: {
    fontSize: AppDimensions.textSize.medium,
    paddingTop: 8,
    paddingHorizontal: 16,
    alignSelf: "flex-start"
  }
});
