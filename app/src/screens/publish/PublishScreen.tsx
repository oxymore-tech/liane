import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, FadeOutRight, SlideInLeft, SlideOutLeft } from "react-native-reanimated";
import { useQueryClient } from "react-query";

import { AppContext } from "@/components/context/ContextProvider";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { DayOfTheWeekPicker } from "@/components/DayOfTheWeekPicker";
import { LianeQueryKey } from "@/screens/user/MyTripsScreen";

import { AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { CoLiane, CoLianeRequest, DayOfWeekFlag, TimeOnly, TimeOnlyUtils, Trip } from "@liane/common";
import { AppModalNavigationContext } from "@/components/AppModalNavigationProvider";
import { useAppNavigation } from "@/components/context/routing";
import { AppLocalization } from "@/api/i18n";
import { AppTextInput } from "@/components/base/AppTextInput.tsx";
import { TimeWheelPicker } from "@/components/TimeWheelPicker.tsx";
import { Accordion } from "@/screens/publish/Accordion.tsx";
import { PageHeader } from "@/components/context/Navigation.tsx";
import { ItinerarySearchForm } from "@/screens/ItinerarySearchForm.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppLogger } from "@/api/logger.ts";

type StepProps<T> = {
  onChange: (v: T) => void;
  value: T;
};

export const PublishScreen = () => {
  const { services } = useContext(AppContext);
  const queryClient = useQueryClient();
  const { navigation, route } = useAppNavigation<"Publish">();
  const initialValue = route.params.initialValue;
  const { showTutorial, shouldShow } = useContext(AppModalNavigationContext);

  const [trip, setTrip] = useState<Partial<Trip>>({});
  const [lianeRequest, setLianeRequest] = useState<Partial<CoLianeRequest>>({
    name: "",
    roundTrip: true,
    arriveBefore: { hour: 9 },
    returnAfter: { hour: 18 },
    canDrive: true,
    weekDays: "0000000",
    isEnabled: true
  });

  const [step, setStep] = useState<number>(initialValue ? 6 : 0);
  const [previousStep, setPreviousStep] = useState<number>(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // Set initial value if exist
    if (route.params.initialValue) {
      setLianeRequest({
        ...route.params.initialValue,
        wayPoints: route.params.initialValue.wayPoints && route.params.initialValue.wayPoints.map(object => object.id)
      } as CoLianeRequest);

      if (route.params.initialValue.wayPoints) {
        setTrip({
          to: route.params.initialValue.wayPoints[route.params.initialValue.wayPoints.length - 1],
          from: route.params.initialValue.wayPoints[0]
        });
      }
    }
  }, [route.params]);

  const handleDone = useCallback(async () => {
    setPending(true);
    try {
      if (initialValue && lianeRequest.id) {
        await services.community.update(lianeRequest.id, {
          ...lianeRequest,
          wayPoints: [trip.from!.id!, trip.to!.id!]
        } as CoLianeRequest);
        navigation.navigate("Lianes");
      } else {
        await queryClient.invalidateQueries(LianeQueryKey);
        const created = await services.community.create({
          ...lianeRequest,
          wayPoints: [trip.from!.id!, trip.to!.id!]
        } as CoLianeRequest);

        navigation.popToTop();
        if (shouldShow) {
          showTutorial("driver", created.id);
        } else {
          navigation.navigate("Lianes");
        }
      }
    } finally {
      setPending(false);
    }
  }, [lianeRequest, navigation, queryClient, services.community, shouldShow, showTutorial, trip.from, trip.to]);

  const stepDone = useCallback(() => {
    if (step < previousStep) {
      setStep(previousStep);
    } else {
      setStep(step + 1);
      setPreviousStep(step + 1);
    }
  }, [step, previousStep]);

  const updateAndNext = useCallback(
    (data: Partial<CoLianeRequest>) => {
      setLianeRequest({ ...lianeRequest, ...data });
      stepDone();
    },
    [stepDone, lianeRequest]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <PageHeader title={"Créer une annonce"} navigation={navigation} />
      <Accordion
        title={"Créer une annonce"}
        step={step}
        onChangeStep={setStep}
        style={styles.accordion}
        header={
          <ItinerarySearchForm
            onRequestFocus={() => setStep(0)}
            editable={step === 0}
            formStyle={styles.stepContainer}
            trip={trip}
            updateTrip={t => {
              const updated = { ...trip, ...t };
              setTrip(updated);
              if (updated.from && updated.to) {
                stepDone();
              }
            }}
          />
        }
        stepStyle={styles.stepContainer}
        steps={[
          {
            title: AppLocalization.formatDaysOfTheWeek(lianeRequest.weekDays) ?? "Pas de jours",
            render: () => <DaysStepView value={lianeRequest.weekDays ?? "0000000"} onChange={weekDays => updateAndNext({ weekDays })} />
          },
          {
            title: `Arriver avant ${AppLocalization.formatTimeOnly(lianeRequest.arriveBefore)}`,
            render: () => (
              <TimeStepView
                title={`Je souhaite arriver à ${trip.to?.city ?? ""} avant ?`}
                value={lianeRequest.arriveBefore ?? { hour: 10 }}
                onChange={arriveBefore => updateAndNext({ arriveBefore })}
              />
            )
          },
          {
            title: `Retour après ${AppLocalization.formatTimeOnly(lianeRequest.returnAfter)}`,
            render: () => (
              <TimeStepView
                title={`Je souhaite repartir de ${trip.to?.city ?? ""} après ?`}
                value={lianeRequest.returnAfter ?? { hour: 18 }}
                onChange={returnAfter => updateAndNext({ returnAfter })}
              />
            )
          },
          {
            title: lianeRequest.canDrive ? "Je peux conduire" : "Uniquement passager",
            render: () => <VehicleStepView value={lianeRequest.canDrive ?? true} onChange={canDrive => updateAndNext({ canDrive })} />
          },
          {
            title: lianeRequest.name ?? "Libélé",
            render: () => <NameStepView value={lianeRequest.name} onChange={v => updateAndNext({ name: v })} />
          }
        ]}
      />
      {step >= 6 && (
        <View style={[styles.accordion, styles.bottom]}>
          <AppButton title="Envoyer" icon="arrow-circle-right-outline" onPress={handleDone} loading={pending} />
        </View>
      )}
    </View>
  );
};

type StepFormProps = {
  title: string;
  children: React.ReactElement | React.ReactElement[];
  disabled?: boolean;
  onValidate: () => void;
};

const StepForm = ({ title, children, disabled = false, onValidate }: StepFormProps) => {
  return (
    <Column spacing={8} style={{ padding: 12 }}>
      <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(600).duration(300).springify().damping(15)}>
        <Center>
          <AppText style={[AppStyles.title, styles.stepTitle]}>{title}</AppText>
        </Center>
      </Animated.View>

      <Animated.View
        style={{ alignItems: "center" }}
        exiting={FadeOutRight.delay(40).duration(150)}
        entering={FadeIn.delay(550).duration(150).springify().damping(20)}>
        {children}
      </Animated.View>

      <AppButton title="Suivant" onPress={onValidate} disabled={disabled} />
    </Column>
  );
};

const DaysStepView = ({ onChange, value }: StepProps<DayOfWeekFlag>) => {
  const [daysOfTheWeek, setDaysOfTheWeek] = useState<DayOfWeekFlag>(value);

  const daysMessage = useMemo(() => AppLocalization.formatDaysOfTheWeek(daysOfTheWeek), [daysOfTheWeek]);

  const cannotValidate = daysOfTheWeek === "0000000";
  return (
    <StepForm title="Quels jours voyagez-vous ?" onValidate={() => onChange(daysOfTheWeek)} disabled={cannotValidate}>
      <DayOfTheWeekPicker selectedDays={daysOfTheWeek} onChangeDays={setDaysOfTheWeek} borderBottomDisplayed={true} />
      <AppText style={{ fontSize: 16, alignSelf: "flex-start", marginVertical: 20 }}>{daysMessage ?? "Sélectionnez un jour"}</AppText>
    </StepForm>
  );
};

function getRoundedTime(n: number): TimeOnly {
  const now = new Date();
  const m = now.getMinutes();
  const rounded = new Date(now.setMinutes((m / 60) * n));
  return TimeOnlyUtils.fromDate(rounded);
}

const TimeConstraintView = ({
  title,
  onChange,
  defaultValue,
  value
}: {
  title?: string;
  defaultValue?: TimeOnly;
  value: TimeOnly;
  onChange: (v: TimeOnly) => void;
}) => {
  return (
    <View>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        {title && <AppText style={{ fontWeight: "bold", paddingVertical: 4 }}>{title}</AppText>}
        {!!value && defaultValue && <AppPressableIcon name={"trash-2-outline"} onPress={() => onChange(defaultValue)} />}
      </Row>
      {!value && defaultValue ? (
        <Pressable onPress={() => onChange(defaultValue)}>
          <Center style={{ paddingVertical: 32 }}>
            <AppIcon name={"plus-circle-outline"} size={32} />
          </Center>
        </Pressable>
      ) : (
        <Animated.View exiting={FadeOut.duration(150)} entering={FadeIn.duration(150).springify().damping(20)}>
          <TimeWheelPicker date={value || getRoundedTime(15)} minuteStep={15} onChange={onChange} minDate={undefined} />
        </Animated.View>
      )}
    </View>
  );
};

type TimeStepProps = StepProps<TimeOnly> & {
  title: string;
};

const TimeStepView = ({ title, onChange, value }: TimeStepProps) => {
  const [internalValue, setInternalValue] = useState(value);

  return (
    <StepForm title={title} onValidate={() => onChange(internalValue)}>
      <TimeConstraintView value={internalValue} onChange={setInternalValue} />
    </StepForm>
  );
};

const VehicleStepView = ({ onChange, value }: StepProps<boolean>) => {
  return (
    <Column spacing={8} style={{ padding: 12 }}>
      <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(600).duration(300).springify().damping(15)}>
        <Center>
          <AppText style={[AppStyles.title, styles.stepTitle]}>Je peux conduire ?</AppText>
        </Center>
      </Animated.View>

      <View style={{ display: "flex", flexDirection: "row", justifyContent: "center", gap: 40 }}>
        <AppButton
          title="Non"
          color={!value ? AppColors.primaryColor : AppColors.grayBackground}
          onPress={() => onChange(false)}
          style={{ width: 80 }}
        />
        <AppButton
          title="Oui"
          color={value ? AppColors.primaryColor : AppColors.grayBackground}
          onPress={() => onChange(true)}
          style={{ width: 80 }}
        />
      </View>
    </Column>
  );
};

const NameStepView = ({ onChange, value }: StepProps<string | undefined>) => {
  const [name, setName] = useState(value);
  const cannotValidate = !name || name.trim().length === 0;
  return (
    <StepForm title="Nommer ce trajet ?" onValidate={() => onChange(name)} disabled={cannotValidate}>
      <AppTextInput value={name} onChangeText={setName} autoFocus={true} placeholder="Choisissez un libéllé pour vous" />
    </StepForm>
  );
};

const styles = StyleSheet.create({
  stepTitle: {
    marginTop: 12
  },
  accordion: {
    paddingHorizontal: 16
  },
  bottom: {
    height: 48,
    marginBottom: 32
  },
  stepContainer: {
    backgroundColor: AppColors.white,
    borderWidth: 2,
    borderColor: AppColors.lightGrayBackground,
    borderRadius: 18,
    paddingVertical: 12
  }
});
