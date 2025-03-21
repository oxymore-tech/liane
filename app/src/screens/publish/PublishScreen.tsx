import React, { useCallback, useContext, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, FadeOutRight, SlideInLeft, SlideOutLeft } from "react-native-reanimated";
import { useQueryClient } from "react-query";

import { AppContext } from "@/components/context/ContextProvider";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { DayOfTheWeekPicker } from "@/components/DayOfTheWeekPicker";

import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { CoLianeRequest, DayOfWeekFlag, getLianeId, ResolvedLianeRequest, TimeOnly, Itinerary } from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";
import { AppLocalization } from "@/api/i18n";
import { AppTextInput } from "@/components/base/AppTextInput.tsx";
import { TimeView } from "@/components/TimeView.tsx";
import { Accordion } from "@/screens/publish/Accordion.tsx";
import { PageHeader } from "@/components/context/Navigation.tsx";
import { ItinerarySearchForm, Notice } from "@/screens/ItinerarySearchForm.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { LianeQueryKey } from "@/util/hooks/query.ts";

type StepProps<T> = {
  onChange: (v: T) => void;
  value: T;
};

const MaxSteps = 5;

function init(initialValue?: Partial<ResolvedLianeRequest>): { value: Partial<CoLianeRequest>; trip: Partial<Itinerary> } {
  if (!initialValue) {
    return {
      value: {
        name: "",
        roundTrip: true,
        arriveBefore: { hour: 9 },
        returnAfter: { hour: 18 },
        canDrive: true,
        weekDays: "0000000",
        isEnabled: true
      },
      trip: {}
    };
  }

  const { wayPoints, ...value } = initialValue;
  if (!wayPoints) {
    return {
      value: value as any,
      trip: {}
    };
  }
  return {
    value: value as any,
    trip: {
      to: wayPoints[wayPoints.length - 1],
      from: wayPoints[0]
    }
  };
}

export const PublishScreen = () => {
  const { services } = useContext(AppContext);
  const queryClient = useQueryClient();
  const { navigation, route } = useAppNavigation<"Publish">();
  const lianeId = useMemo(() => (route.params.liane ? getLianeId(route.params.liane) : undefined), [route.params.liane]);
  const initValues = useMemo(() => init(route.params.initialValue), [route.params.initialValue]);

  const [trip, setTrip] = useState<Partial<Itinerary>>(initValues.trip);
  const [lianeRequest, setLianeRequest] = useState<Partial<CoLianeRequest>>(initValues.value);

  const [step, setStep] = useState<number>(lianeId ? -1 : route.params.initialValue ? MaxSteps : -1);
  const [previousStep, setPreviousStep] = useState<number>(-1);
  const [pending, setPending] = useState(false);

  const [notice, setNotice] = useState<Notice | undefined>(
    lianeId ? { type: "info", message: "Veuillez sélectionner des points compatibles" } : undefined
  );

  const handleDone = useCallback(async () => {
    setPending(true);
    try {
      const newLianeRequest = {
        ...lianeRequest,
        wayPoints: [trip.from!.id!, trip.to!.id!]
      } as CoLianeRequest;
      if (route.params.initialValue && lianeRequest.id) {
        await services.community.update(lianeRequest.id, newLianeRequest);
      } else {
        const created = await services.community.create(newLianeRequest);
        if (lianeId) {
          await services.community.joinRequest(created.id!, lianeId);
        }
      }
      await queryClient.invalidateQueries(LianeQueryKey);
      navigation.popToTop();
      // @ts-ignore
      navigation.navigate("Home", { screen: "Lianes" });
    } finally {
      setPending(false);
    }
  }, [route.params.initialValue, lianeId, lianeRequest, navigation, queryClient, services.community, trip.from, trip.to]);

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

  const handleUpdateTrip = useCallback(
    async (t: Partial<Itinerary>) => {
      const updated = { ...trip, ...t };
      setTrip(updated);
      if (!updated.from || !updated.to) {
        return;
      }

      if (!lianeId) {
        stepDone();
        return;
      }

      setNotice("loading");

      const pendingMatch = await services.community.matches(lianeId, updated.from.id!, updated.to.id!);
      if (!pendingMatch?.pickup || !pendingMatch.deposit) {
        setNotice({ type: "error", message: "Votre trajet n'est pas compatible !" });
        return;
      }
      setNotice({ type: "info", message: "Les trajets sont compatibles" });
      stepDone();
    },
    [lianeId, services.community, stepDone, trip]
  );

  const title = useMemo(
    () =>
      lianeId
        ? "Vous avez choisi de rejoindre cette liane, dites-nous en plus sur votre trajet habituel"
        : "Indiquez un trajet habituel et nous rechercherons des propositions pour vous",
    [lianeId]
  );

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={lianeId ? "Rejoindre la liane" : "Rechercher ou lancer une liane"} navigation={navigation} />
      <AppText
        style={{ fontSize: 16, marginBottom: 16, paddingHorizontal: 16, textAlign: "center", color: AppColorPalettes.orange[500] }}
        numberOfLines={5}>
        {title}
      </AppText>
      <ItinerarySearchForm
        style={{ paddingHorizontal: 16 }}
        formStyle={styles.stepContainer}
        onRequestFocus={() => setStep(-1)}
        notice={notice}
        editable={step === -1}
        liane={lianeId}
        trip={trip}
        updateTrip={handleUpdateTrip}
      />
      {step >= 0 && (
        <Accordion
          step={step}
          onChangeStep={setStep}
          style={styles.accordion}
          stepStyle={styles.stepContainer}
          steps={[
            {
              title: AppLocalization.formatDaysOfTheWeek(lianeRequest.weekDays),
              render: () => (
                <DaysStepView
                  value={lianeRequest.weekDays ?? "0000000"}
                  requiredDays={route.params.liane?.weekDays}
                  onChange={weekDays => updateAndNext({ weekDays })}
                />
              )
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
              title: lianeRequest.name ?? "Libéllé",
              render: () => <NameStepView value={lianeRequest.name} onChange={v => updateAndNext({ name: v })} />
            }
          ]}
        />
      )}
      {step >= MaxSteps && (
        <View style={[styles.accordion, styles.bottom]}>
          <AppButton value="Envoyer" icon="arrow-right" onPress={handleDone} loading={pending} />
        </View>
      )}
    </View>
  );
};

type StepFormProps = {
  title: string;
  children: React.ReactElement | React.ReactElement[];
  disabled?: boolean;
  onValidate?: () => void;
};

const StepForm = ({ title, children, disabled = false, onValidate }: StepFormProps) => {
  return (
    <Column spacing={8} style={{ padding: 12 }}>
      <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(600).duration(300).springify().damping(15)}>
        <Center>
          <AppText style={AppStyles.title}>{title}</AppText>
        </Center>
      </Animated.View>

      <Animated.View
        style={{ alignItems: "center" }}
        exiting={FadeOutRight.delay(40).duration(150)}
        entering={FadeIn.delay(550).duration(150).springify().damping(20)}>
        {children}
      </Animated.View>

      {onValidate && <AppButton value="Suivant" onPress={onValidate} disabled={disabled} />}
    </Column>
  );
};

const DaysStepView = ({ onChange, value, requiredDays }: StepProps<DayOfWeekFlag> & { requiredDays?: DayOfWeekFlag }) => {
  const [daysOfTheWeek, setDaysOfTheWeek] = useState<DayOfWeekFlag>(value);

  const daysMessage = useMemo(() => AppLocalization.formatDaysOfTheWeek(daysOfTheWeek), [daysOfTheWeek]);

  const isValid = daysOverlap(daysOfTheWeek, requiredDays) && daysOfTheWeek !== "0000000";
  return (
    <StepForm title="Quels jours voyagez-vous ?" onValidate={() => onChange(daysOfTheWeek)} disabled={!isValid}>
      <DayOfTheWeekPicker requiredDays={requiredDays} selectedDays={daysOfTheWeek} onChangeDays={setDaysOfTheWeek} />
      <AppText style={{ fontSize: 16, alignSelf: "flex-start", marginVertical: 20 }}>{daysMessage ?? "Sélectionnez un jour"}</AppText>
    </StepForm>
  );
};

function daysOverlap(days: DayOfWeekFlag, requiredDays?: DayOfWeekFlag): boolean {
  if (!requiredDays) {
    return true;
  }

  for (let i = 0; i < days.length; i++) {
    if (days[i] === "1" && requiredDays[i] === "1") {
      return true;
    }
  }

  return false;
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
        {!!value && defaultValue && <AppPressableIcon name="trash" onPress={() => onChange(defaultValue)} />}
      </Row>
      {!value && defaultValue ? (
        <Pressable onPress={() => onChange(defaultValue)}>
          <Center style={{ paddingVertical: 32 }}>
            <AppIcon name="plus" size={32} />
          </Center>
        </Pressable>
      ) : (
        <Animated.View exiting={FadeOut.duration(150)} entering={FadeIn.duration(150).springify().damping(20)}>
          <TimeView value={value} onChange={onChange} editable />
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
    <StepForm title="Je peux conduire ?">
      <Row spacing={40}>
        <AppButton
          value="Non"
          color={!value ? AppColors.primaryColor : AppColors.grayBackground}
          onPress={() => onChange(false)}
          style={{ width: 80 }}
        />
        <AppButton
          value="Oui"
          color={value ? AppColors.primaryColor : AppColors.grayBackground}
          onPress={() => onChange(true)}
          style={{ width: 80 }}
        />
      </Row>
    </StepForm>
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
    paddingVertical: 6
  }
});
