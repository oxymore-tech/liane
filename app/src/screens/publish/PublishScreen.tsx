import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  FadeOutLeft,
  FadeOutRight,
  SlideInDown,
  SlideInLeft,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";
import { useActor, useInterpret } from "@xstate/react";

import { AppContext } from "@/components/context/ContextProvider";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
import { AppBackContextProvider } from "@/components/AppBackContextProvider";
import { AppStatusBar } from "@/components/base/AppStatusBar";
import { DayOfTheWeekPicker } from "@/components/DayOfTheWeekPicker";

import { CreatePublishLianeMachine, PublishLianeContext, PublishStateCount, TimeIntervalConstraint } from "@/screens/publish/StateMachine";
import { ItinerarySearchForm } from "@/screens/ItinerarySearchForm";
import { SelectOnMapView } from "@/screens/publish/SelectOnMapView";
import { LianeQueryKey } from "@/screens/user/MyTripsScreen";

import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { DayOfWeekFlag, TimeConstraint, TimeOnly } from "@liane/common";
import { PageHeader } from "@/components/context/Navigation";
import { AppModalNavigationContext } from "@/components/AppModalNavigationProvider";
import { useAppNavigation } from "@/components/context/routing";
import { AppLocalization } from "@/api/i18n";
import { AppTextInput } from "@/components/base/AppTextInput.tsx";
import { TimeWheelPicker } from "@/components/TimeWheelPicker.tsx";

interface StepProps<T> {
  editable: boolean;
  onChange: (v: T) => void;
  initialValue: T | undefined;
  onRequestEdit: () => void;
  animationType: "firstEntrance" | "ease";
}

export const PublishScreen = () => {
  const { services } = useContext(AppContext);
  const queryClient = useQueryClient();
  const { navigation, route } = useAppNavigation<"Publish">();
  const { showTutorial, shouldShow } = useContext(AppModalNavigationContext);

  const [m] = useState(() =>
    CreatePublishLianeMachine(async ctx => {
      // Compute time constraint
      const timeConstraints: TimeConstraint[] = [];
      if (ctx.request.departureConstraints?.arriveBefore || ctx.request.departureConstraints?.leaveAfter) {
        let end = ctx.request.departureConstraints?.arriveBefore;
        const tEnd = end ? { hour: end.getHours(), minute: end.getMinutes() } : { hour: 23, minute: 59 };
        let start = ctx.request.departureConstraints?.leaveAfter;
        const tStart = start ? { hour: start.getHours(), minute: start.getMinutes() } : { hour: 0, minute: 0 };
        timeConstraints.push({ when: { start: tStart as TimeOnly, end: tEnd as TimeOnly }, at: ctx.request.from!.id! });
      }

      const liane = await services.community.create({
        wayPoints: [ctx.request.from!.id!, ctx.request.to!.id!],
        roundTrip: !!ctx.request.returnConstraints,
        canDrive: ctx.request.availableSeats! > 0,
        weekDays: ctx.request.recurrence!,
        isEnabled: true,
        timeConstraints,
        name: ctx.request.name || ""
      });

      await queryClient.invalidateQueries(LianeQueryKey);
      await services.location.cacheRecentTrip({ to: ctx.request.to!, from: ctx.request.from! });
      return liane;
    }, route.params?.initialValue)
  );
  const machine = useInterpret(m);
  const [state] = useActor(machine);
  useEffect(() => {
    if (!state.done) {
      return;
    }
    machine.onDone(() => {
      navigation.popToTop();
      if (shouldShow) {
        showTutorial("driver", state.context.created!.id);
      } else {
        navigation.navigate("Communities");
      }
    });
  }, [machine, navigation, shouldShow, showTutorial, state.context.created, state.done]);

  return (
    /*  @ts-ignore */
    <PublishLianeContext.Provider value={machine}>
      <PublishScreenView />
      <AppStatusBar style="dark-content" />
    </PublishLianeContext.Provider>
  );
};

export const PublishScreenView = () => {
  const { navigation } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const machine = useContext(PublishLianeContext);
  const [state] = useActor(machine);

  const isTripStep = state.matches("trip");
  const isDateStep = state.matches("days");
  const isTimeStep = state.matches("time");
  const isVehicleStep = state.matches("vehicle");
  const isReturnStep = state.matches("return");
  const isReturnTimeStep = state.matches("returnTime");
  const isNameStep = state.matches("name");
  const isOverviewStep = state.matches("overview");
  const isSubmittingStep = state.matches("submitting");

  const step = useSharedValue(0);
  const { width } = useWindowDimensions();
  const stepperIndicatorStyle = useAnimatedStyle(() => {
    return {
      width: withTiming((step.value * width) / PublishStateCount, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    };
  }, []);

  const nextStep = (target: number) => {
    step.value = Math.min(PublishStateCount, Math.max(target, step.value));
  };

  const offsetsTop = {
    dateStep: insets.top + 172 - 24,
    timeStep: insets.top + 172 - 24 * 2 + 80,
    vehicleStep: insets.top + 172 - 24 * 3 + 80 * 2,
    returnStep: insets.top + 172 - 24 * 4 + 80 * 3,
    nameStep: insets.top + 172 - 24 * 5 + 80 * 4
  };

  if (state.matches("map")) {
    const isFrom = state.toStrings()[1].endsWith(".from");
    return (
      <AppBackContextProvider
        backHandler={() => {
          machine.send("BACK");
          return true;
        }}>
        <SelectOnMapView
          onSelect={p => machine.send("UPDATE", { data: { [isFrom ? "from" : "to"]: p } })}
          title={"Choisissez un point " + (isFrom ? "de départ" : "d'arrivée")}
        />
      </AppBackContextProvider>
    );
  }

  const hasError = state.matches({ submitting: "failure" });

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.white, paddingBottom: insets.bottom }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={isReturnStep ? { height: 900 } : null}>
          <PageHeader title={"Créer une annonce"} navigation={navigation} />
          {(isOverviewStep || isSubmittingStep || isNameStep) && (
            <Animated.View
              exiting={SlideOutLeft.duration(20)}
              entering={SlideInLeft.delay(50).duration(300).springify().damping(20)}
              style={[
                styles.footerContainer,
                { marginTop: isNameStep ? offsetsTop.nameStep + 62 : offsetsTop.nameStep + 48 },
                !isNameStep ? styles.compactedStepStyle : null,
                !isNameStep ? AppStyles.shadow : null
              ]}>
              <NameStepView
                editable={isNameStep}
                animationType={state.context.request.returnConstraints === undefined ? "firstEntrance" : "ease"}
                onRequestEdit={() => machine.send("NAME", { data: { name: null } })}
                onChange={v => machine.send("UPDATE", { data: { name: v } })}
                initialValue={state.context.request.name}
              />
            </Animated.View>
          )}

          {(isOverviewStep || isSubmittingStep || isReturnStep || isNameStep) && (
            <Animated.View
              exiting={SlideOutLeft.duration(20)}
              entering={SlideInLeft.delay(50).duration(300).springify().damping(20)}
              style={[
                styles.footerContainer,
                { marginTop: isReturnStep ? offsetsTop.returnStep + 62 : offsetsTop.returnStep + 48 },
                !isReturnStep ? styles.compactedStepStyle : null,
                !isReturnStep ? AppStyles.shadow : null
              ]}>
              <ReturnStepView
                editable={isReturnStep}
                animationType={state.context.request.returnConstraints === undefined ? "firstEntrance" : "ease"}
                onRequestEdit={() => machine.send("RETURN", { data: { returnTime: null } })}
                onChange={v => machine.send("UPDATE", { data: { returnTime: v } })}
                initialValue={state.context.request.returnConstraints}
              />
            </Animated.View>
          )}

          {!isTripStep && !isDateStep && !isTimeStep && (
            <Animated.View
              exiting={SlideOutLeft.duration(20)}
              entering={SlideInLeft.delay(50).duration(300).springify().damping(20)}
              style={[
                styles.footerContainer,
                { marginTop: isVehicleStep ? offsetsTop.vehicleStep + 62 : offsetsTop.vehicleStep + 48 },
                !isVehicleStep ? styles.compactedStepStyle : null,
                !isVehicleStep ? AppStyles.shadow : null
              ]}>
              <VehicleStepView
                animationType={step.value < 3 ? "firstEntrance" : "ease"}
                editable={isVehicleStep}
                initialValue={state.context.request.availableSeats}
                onRequestEdit={() => machine.send("EDIT", { data: "vehicle" })}
                onChange={d => {
                  machine.send("NEXT", { data: { availableSeats: d } });
                  nextStep(4);
                }}
              />
            </Animated.View>
          )}

          {!isTripStep && !isDateStep && (
            <Animated.View
              exiting={SlideOutLeft.duration(20)}
              entering={SlideInLeft.delay(50).duration(300).springify().damping(20)}
              style={[
                styles.footerContainer,
                { marginTop: isTimeStep ? offsetsTop.timeStep + 62 : offsetsTop.timeStep + 48 },
                !isTimeStep ? styles.compactedStepStyle : null,
                !isTimeStep ? AppStyles.shadow : null
              ]}>
              <TimeStepView
                animationType={step.value < PublishStateCount ? "firstEntrance" : "ease"}
                editable={isTimeStep}
                initialValue={state.context.request.departureConstraints}
                onRequestEdit={() => machine.send("EDIT", { data: "time" })}
                onChange={d => {
                  machine.send("NEXT", { data: { departureConstraints: d } });
                  nextStep(3);
                }}
              />
            </Animated.View>
          )}

          {!isTripStep && (
            <Animated.View
              exiting={SlideOutLeft.duration(20)}
              entering={SlideInLeft.duration(300).springify().damping(20)}
              style={[
                styles.footerContainer,
                { marginTop: isDateStep ? offsetsTop.dateStep + 62 : offsetsTop.dateStep + 48 },
                !isDateStep ? styles.compactedStepStyle : null,
                !isDateStep ? AppStyles.shadow : null
              ]}>
              <DaysStepView
                animationType={step.value < PublishStateCount ? "firstEntrance" : "ease"}
                editable={isDateStep}
                initialValue={{ recurrence: state.context.request.recurrence }}
                onRequestEdit={() => machine.send("EDIT", { data: "days" })}
                onChange={data => {
                  machine.send("NEXT", { data: { recurrence: data.recurrence } });
                  nextStep(2);
                }}
              />
            </Animated.View>
          )}

          <ItinerarySearchForm
            editable={isTripStep}
            animateEntry={Platform.OS === "ios"} // TODO : investigate android issue where animation does not start
            trip={state.context.request}
            onSelectTrip={t => {
              machine.send("NEXT", { data: t });
              nextStep(1);
            }}
            updateTrip={t => {
              if (isTripStep) {
                machine.send("UPDATE", { data: t });
              } else {
                machine.send([
                  { type: "EDIT", data: "trip" },
                  { type: "UPDATE", data: t }
                ]);
              }
            }}
            openMap={data => machine.send("MAP", { data })}
          />
          {/*
          <Animated.View style={[styles.stepperIndicatorBaseStyle, stepperIndicatorStyle]} />
          */}
        </View>
      </ScrollView>

      {(isOverviewStep || isSubmittingStep) && (
        <Animated.View entering={SlideInDown.springify().damping(20)} style={styles.overviewStepContainer}>
          <AppPressableOverlay
            disabled={!hasError && !isOverviewStep}
            onPress={() => {
              machine.send(isOverviewStep ? "PUBLISH" : "RETRY");
            }}
            style={styles.overviewStep}
            backgroundStyle={styles.overviewStepBackground}>
            <Row spacing={8} style={{ alignItems: "center" }}>
              <AppText style={styles.overviewStepText}>{isOverviewStep ? "Envoyer" : hasError ? "Rééssayer" : "Publication"}</AppText>
              {isOverviewStep && <AppIcon name={"arrow-circle-right-outline"} color={AppColors.white} />}
              {isSubmittingStep && state.matches({ submitting: "pending" }) && (
                <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.white} size="large" />
              )}
              {isSubmittingStep && hasError && <AppIcon name={"refresh-outline"} color={AppColors.white} />}
            </Row>
          </AppPressableOverlay>
        </Animated.View>
      )}
    </View>
  );
};

const DaysStepView = ({ editable, onChange, initialValue, onRequestEdit }: StepProps<{ recurrence: DayOfWeekFlag | null | undefined }>) => {
  const [daysOfTheWeek, setDaysOfTheWeek] = useState<DayOfWeekFlag>(initialValue?.recurrence ?? "0000000");

  const daysMessage = useMemo(() => {
    if (daysOfTheWeek === "0000000") {
      return null;
    } else if (daysOfTheWeek === "1111111") {
      return "Tous les jours";
    } else {
      return "Les " + AppLocalization.formatDaysOfTheWeek(daysOfTheWeek);
    }
  }, [daysOfTheWeek]);

  const cannotValidate = daysOfTheWeek === "0000000";
  return (
    <Pressable disabled={editable} onPress={onRequestEdit}>
      {!editable && (
        <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
          <Row style={styles.stepResumeContainer} spacing={8}>
            <Row style={{ flexShrink: 1, flexGrow: 1 }}>
              <AppText style={[styles.stepResume, { flexShrink: 1, paddingRight: 0 }]}>{daysMessage}</AppText>
            </Row>
            <AppIcon name={"edit-2"} color={AppColors.white} />
          </Row>
        </Animated.View>
      )}

      <Column spacing={8}>
        {editable && (
          <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(600).duration(300).springify().damping(15)}>
            <Center>
              <AppText style={[AppStyles.title, styles.stepTitle]}>Quels jours voyagez-vous ?</AppText>
            </Center>
          </Animated.View>
        )}

        {editable && (
          <Animated.View
            style={{ alignItems: "center" }}
            exiting={FadeOutRight.delay(40).duration(150)}
            entering={FadeIn.delay(550).duration(150).springify().damping(20)}>
            <DayOfTheWeekPicker selectedDays={daysOfTheWeek} onChangeDays={setDaysOfTheWeek} borderBottomDisplayed={true} />
            <AppText style={{ flexShrink: 1, paddingRight: 0, fontSize: 16, alignSelf: "flex-start", paddingHorizontal: 12 }}>
              {daysMessage ?? "Sélectionnez un jour"}
            </AppText>
          </Animated.View>
        )}

        {editable && (
          <Row spacing={8} style={styles.validateContainer}>
            <AppPressableOverlay
              backgroundStyle={[
                styles.validateButtonBackground,
                { backgroundColor: cannotValidate ? AppColorPalettes.gray[300] : AppColors.primaryColor }
              ]}
              style={styles.validateButton}
              disabled={cannotValidate}
              onPress={() => {
                onChange({ recurrence: daysOfTheWeek });
              }}>
              <Center>
                <Row spacing={4}>
                  <AppText style={styles.validateText}>Suivant</AppText>
                </Row>
              </Center>
            </AppPressableOverlay>
          </Row>
        )}
      </Column>
    </Pressable>
  );
};

const getRoundedTime = (n: number) => {
  const now = new Date();
  const m = now.getMinutes();
  return new Date(now.setMinutes((m / 60) * n));
};

const TimeConstraintView = ({ title, onChange, value }: { title: string; value: Date | undefined | null; onChange: (v: Date | null) => void }) => {
  return (
    <View style={{ borderColor: AppColors.primaryColor, borderWidth: 4, borderRadius: 12, padding: 8, flex: 1 }}>
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <AppText style={{ fontWeight: "bold", paddingVertical: 4 }}>{title}</AppText>
        {!!value && <AppPressableIcon name={"trash-2-outline"} onPress={() => onChange(null)} />}
      </Row>
      {!value ? (
        <Pressable onPress={() => onChange(new Date())}>
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

const TimeStepView = ({ editable, onChange, initialValue, onRequestEdit }: StepProps<TimeIntervalConstraint>) => {
  const [arriveBefore, setArriveBefore] = useState(initialValue?.arriveBefore);
  const [leaveAfter, setLeaveAfter] = useState(initialValue?.leaveAfter);

  const daysMessage = useMemo(() => {
    if (!!arriveBefore && !!leaveAfter) {
      return `Entre ${AppLocalization.formatTime(leaveAfter)} et ${AppLocalization.formatTime(arriveBefore)}`;
    } else if (arriveBefore) {
      return `Arrivée avant ${AppLocalization.formatTime(arriveBefore)}`;
    } else if (leaveAfter) {
      return `Départ à partir de ${AppLocalization.formatTime(leaveAfter)}`;
    } else {
      return "Journée entière";
    }
  }, [arriveBefore, leaveAfter]);

  return (
    <Pressable disabled={editable} onPress={onRequestEdit}>
      {!editable && (
        <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
          <Row style={styles.stepResumeContainer} spacing={8}>
            <AppText style={[styles.stepResume, { flexShrink: 1, paddingRight: 0 }]}>{daysMessage}</AppText>

            <AppIcon name={"edit-2"} color={AppColors.white} />
          </Row>
        </Animated.View>
      )}

      <Column spacing={8}>
        {editable && (
          <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(600).duration(300).springify().damping(15)}>
            <Center>
              <AppText style={[AppStyles.title, styles.stepTitle]}>Quels sont vos horaires ?</AppText>
            </Center>

            <Center>
              <AppText>{daysMessage}</AppText>
            </Center>
          </Animated.View>
        )}

        {editable && (
          <Animated.View exiting={FadeOutLeft.delay(50).duration(150)} entering={SlideInLeft.delay(650).duration(300).springify().damping(20)}>
            <Row spacing={16} style={{ padding: 16 }}>
              <TimeConstraintView title={"Partir après"} value={leaveAfter} onChange={setLeaveAfter} />
              <TimeConstraintView title={"Arriver avant"} value={arriveBefore} onChange={setArriveBefore} />
            </Row>
          </Animated.View>
        )}

        {editable && (
          <Row spacing={8} style={styles.validateContainer}>
            <AppPressableOverlay
              backgroundStyle={[styles.validateButtonBackground, { backgroundColor: AppColors.primaryColor }]}
              style={styles.validateButton}
              onPress={() => {
                onChange({ leaveAfter, arriveBefore });
              }}>
              <Center>
                <Row spacing={4}>
                  <AppText style={styles.validateText}>Suivant</AppText>
                </Row>
              </Center>
            </AppPressableOverlay>
          </Row>
        )}
      </Column>
    </Pressable>
  );
};

const VehicleStepView = ({ editable, onChange, initialValue, onRequestEdit }: StepProps<number>) => {
  //const [seats, setSeats] = useState(initialValue || 1);

  const seats = initialValue || 1;
  return (
    <Pressable disabled={editable} onPress={onRequestEdit}>
      <Column spacing={2}>
        {editable && (
          <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(600).duration(300).springify().damping(15)}>
            <Center>
              <AppText style={[AppStyles.title, styles.stepTitle]}>Pouvez-vous être conducteur ?</AppText>
            </Center>
          </Animated.View>
        )}

        {!editable && (
          <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
            <Row style={styles.stepResumeContainer} spacing={8}>
              <AppText style={[styles.stepResume]}>{seats > 0 ? "Je peux conduire" : "Je suis passager"}</AppText>
              <AppIcon name={"edit-2"} color={AppColors.white} />
            </Row>
          </Animated.View>
        )}

        {/*editable && (
          <Animated.View entering={FadeInDown.delay(1100)}>
            <Column style={styles.flexStretch}>
              <View style={styles.vehicleStepSeatsContainer}>
                <SeatsForm seats={seats} setSeats={setSeats} />
              </View>
            </Column>
          </Animated.View>
        )*/}

        {editable && (
          <Row spacing={8} style={styles.validateContainer}>
            <AppPressableOverlay
              backgroundStyle={styles.cancelButtonBackground}
              style={styles.validateButton}
              onPress={() => {
                // setDate(null);
                onChange(-1);
              }}>
              <Center>
                <Row spacing={4}>
                  <AppText style={styles.cancelText}>Non</AppText>
                </Row>
              </Center>
            </AppPressableOverlay>
            <AppPressableOverlay backgroundStyle={styles.validateButtonBackground} style={styles.validateButton} onPress={() => onChange(1)}>
              <Center>
                <Row spacing={4}>
                  <AppText style={styles.validateText}>Oui</AppText>
                </Row>
              </Center>
            </AppPressableOverlay>
          </Row>
        )}
      </Column>
    </Pressable>
  );
};

const ReturnStepView = ({ editable, onChange, initialValue, onRequestEdit }: StepProps<TimeIntervalConstraint | null>) => {
  const [arriveBefore, setArriveBefore] = useState(initialValue?.arriveBefore);
  const [leaveAfter, setLeaveAfter] = useState(initialValue?.leaveAfter);

  const daysMessage = useMemo(() => {
    if (!!arriveBefore && !!leaveAfter) {
      return `Retour entre ${AppLocalization.formatTime(leaveAfter)} et ${AppLocalization.formatTime(arriveBefore)}`;
    } else if (arriveBefore) {
      return `Retour avant ${AppLocalization.formatTime(arriveBefore)}`;
    } else if (leaveAfter) {
      return `Retour à partir de ${AppLocalization.formatTime(leaveAfter)}`;
    } else {
      return "Retour sur journée entière";
    }
  }, [arriveBefore, leaveAfter]);

  return (
    <Pressable disabled={editable} onPress={onRequestEdit}>
      {!editable && (
        <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
          <Row style={styles.stepResumeContainer} spacing={8}>
            <AppText style={styles.stepResume}>{daysMessage}</AppText>
            <AppIcon name={"edit-2"} color={AppColors.white} />
          </Row>
        </Animated.View>
      )}

      {editable && (
        <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(600).duration(300).springify().damping(15)}>
          <Center>
            <AppText style={[AppStyles.title, styles.stepTitle]}>Quels sont vos horaires de retour ?</AppText>
          </Center>

          <Center>
            <AppText>{daysMessage}</AppText>
          </Center>
        </Animated.View>
      )}

      <Column spacing={8}>
        {editable && (
          <Animated.View exiting={FadeOutLeft.delay(50).duration(150)} entering={SlideInLeft.delay(650).duration(300).springify().damping(20)}>
            <Row spacing={16} style={{ padding: 16 }}>
              <TimeConstraintView title={"Partir après"} value={leaveAfter} onChange={setLeaveAfter} />
              <TimeConstraintView title={"Arriver avant"} value={arriveBefore} onChange={setArriveBefore} />
            </Row>
          </Animated.View>
        )}

        {editable && (
          <Row spacing={8} style={styles.validateContainer}>
            <AppPressableOverlay
              backgroundStyle={[styles.validateButtonBackground, { backgroundColor: AppColors.primaryColor }]}
              style={styles.validateButton}
              onPress={() => {
                onChange({ leaveAfter, arriveBefore });
              }}>
              <Center>
                <Row spacing={4}>
                  <AppText style={styles.validateText}>Suivant</AppText>
                </Row>
              </Center>
            </AppPressableOverlay>
          </Row>
        )}
      </Column>
    </Pressable>
  );
};

const NameStepView = ({ editable, onChange, initialValue, onRequestEdit }: StepProps<string | undefined>) => {
  const [name, setName] = useState(initialValue);
  return (
    <Pressable disabled={editable} onPress={onRequestEdit}>
      <Column spacing={8}>
        {editable && (
          <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(280).duration(300).springify().damping(15)}>
            <Center>
              <AppText style={[AppStyles.title, styles.stepTitle]}>Nommer ce trajet ?</AppText>
            </Center>
          </Animated.View>
        )}

        {!editable && (
          <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
            <Row style={styles.stepResumeContainer} spacing={8}>
              <AppText style={styles.stepResume}>{initialValue || "Pas de libellé"}</AppText>
              <AppIcon name={"edit-2"} color={AppColors.white} />
            </Row>
          </Animated.View>
        )}

        {editable && (
          <View style={{ marginHorizontal: 16, padding: 8, borderRadius: 12, backgroundColor: AppColors.grayBackground }}>
            <AppTextInput value={name} onChangeText={setName} />
          </View>
        )}

        {editable && (
          <Row spacing={8} style={styles.validateContainer}>
            <AppPressableOverlay
              backgroundStyle={styles.cancelButtonBackground}
              style={styles.validateButton}
              onPress={() => {
                onChange(undefined);
              }}>
              <Center>
                <Row spacing={4}>
                  <AppText style={styles.cancelText}>Annuler</AppText>
                </Row>
              </Center>
            </AppPressableOverlay>
            <AppPressableOverlay backgroundStyle={styles.validateButtonBackground} style={styles.validateButton} onPress={() => onChange(name)}>
              <Center>
                <Row spacing={4}>
                  <AppText style={styles.validateText}>Valider</AppText>
                </Row>
              </Center>
            </AppPressableOverlay>
          </Row>
        )}
      </Column>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  flexStretch: {
    alignSelf: "stretch"
  },
  stepperIndicatorBaseStyle: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 4,
    borderTopRightRadius: 16,
    backgroundColor: AppColors.primaryColor
  },
  compactedStepStyle: {
    backgroundColor: AppColors.primaryColor,
    top: -15,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0
  },
  stepTitle: {
    marginTop: 12
  },
  stepResumeContainer: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 28
  },
  stepResume: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal: 12,
    alignSelf: "center",
    textAlignVertical: "center"
  },
  validateContainer: {
    paddingHorizontal: 8,
    marginTop: 20
  },
  validateButtonBackground: {
    flex: 1,
    backgroundColor: AppColors.primaryColor,
    borderRadius: 20
  },
  cancelButtonBackground: {
    flex: 1,
    borderColor: AppColors.primaryColor,
    borderWidth: 1,
    borderRadius: 20
  },
  validateButton: {
    paddingVertical: 12
  },
  validateText: {
    fontSize: 18,
    color: AppColors.white
  },
  cancelText: {
    fontSize: 18,
    color: AppColors.primaryColor
  },
  overviewStepContainer: {
    position: "absolute",
    bottom: 10,
    padding: 16,
    width: "100%"
  },
  overviewStep: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16
  },
  overviewStepBackground: {
    borderRadius: 20,
    backgroundColor: AppColors.primaryColor
  },
  overviewStepText: {
    fontSize: 18,
    color: AppColors.white
  },
  footerContainer: {
    borderWidth: 2,
    borderColor: AppColors.lightGrayBackground,
    margin: 16,
    marginTop: 4,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexShrink: 1,
    paddingBottom: 8,
    alignSelf: "center",
    borderRadius: 18
  },
  inputContainer: {
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  monkeySmilingVectorContainer: {
    position: "relative",
    top: 10,
    left: 32,
    alignItems: "stretch"
  },
  vehicleStepSeatsContainer: {
    marginHorizontal: 16
  }
});
