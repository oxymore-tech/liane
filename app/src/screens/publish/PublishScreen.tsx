import React, { useContext, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOutLeft,
  FadeOutRight,
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideInUp,
  SlideOutLeft,
  SlideOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";
import { useActor, useInterpret } from "@xstate/react";

import { DayOfTheWeekFlag } from "@/api";
import { useAppNavigation } from "@/api/navigation";
import { formatDaysOfTheWeek, formatMonthDay, formatTime, toRelativeTimeString } from "@/api/i18n";

import { AppContext } from "@/components/context/ContextProvider";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { DatePagerSelector } from "@/components/DatePagerSelector";
import { AppToggle } from "@/components/base/AppOptionToggle";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { MonkeySmilingVector } from "@/components/vectors/MonkeySmilingVector";
import { SeatsForm } from "@/components/forms/SeatsForm";
import { AppBackContextProvider } from "@/components/AppBackContextProvider";
import { AppStatusBar } from "@/components/base/AppStatusBar";
import { DayOfTheWeekPicker } from "@/components/DayOfTheWeekPicker";

import { CreatePublishLianeMachine, PublishLianeContext } from "@/screens/publish/StateMachine";
import { ItinerarySearchForm } from "@/screens/ItinerarySearchForm";
import { SelectOnMapView } from "@/screens/publish/SelectOnMapView";
import { LianeQueryKey } from "@/screens/user/MyTripsScreen";

import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { getFirstFutureDate } from "@/util/datetime";
import { TimeWheelPicker } from "@/components/TimeWheelPicker";

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

  const [m] = useState(() =>
    CreatePublishLianeMachine(async ctx => {
      const liane = await services.liane.post({
        to: ctx.request.to!.id!,
        from: ctx.request.from!.id!,
        departureTime: ctx.request.departureTime!.toISOString(),
        availableSeats: ctx.request.availableSeats!,
        returnTime: ctx.request.returnTime?.toISOString(),
        recurrence: ctx.request.recurrence || null
      });

      if (liane) {
        await queryClient.invalidateQueries(LianeQueryKey);
        await services.location.cacheRecentTrip({ to: ctx.request.to!, from: ctx.request.from! });
      }
    }, route.params?.initialValue)
  );
  const machine = useInterpret(m);
  machine.onDone(() => {
    navigation.popToTop();
    //@ts-ignore
    navigation.navigate("Mes trajets");
  });

  return (
    /*  @ts-ignore */
    <PublishLianeContext.Provider value={machine}>
      <PublishScreenView />
      <AppStatusBar style="light-content" />
    </PublishLianeContext.Provider>
  );
};

export const PublishScreenView = () => {
  const insets = useSafeAreaInsets();
  const machine = useContext(PublishLianeContext);
  const [state] = useActor(machine);

  const isTripStep = state.matches("trip");
  const isDateStep = state.matches("date");
  const isVehicleStep = state.matches("vehicle");
  const isReturnStep = state.matches("return");
  const isOverviewStep = state.matches("overview");
  const isSubmittingStep = state.matches("submitting");

  console.log("[PublishScreen] State Value:", state.value);
  console.log("[PublishScreen] State Request:", state.context.request);

  const step = useSharedValue(0);
  const { width } = useWindowDimensions();
  const stepperIndicatorStyle = useAnimatedStyle(() => {
    return {
      width: withTiming((step.value * width) / 3, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    };
  }, []);

  const nextStep = (target: number) => {
    step.value = Math.min(3, Math.max(target, step.value));
  };

  const offsetsTop = {
    dateStep: insets.top + 160 - 24,
    vehicleStep: insets.top + 160 - 24 * 2 + 80,
    returnStep: insets.top + 160 - 24 * 3 + 80 * 2
  };

  if (state.matches("map")) {
    console.debug(state.toStrings()[1]);
    const isFrom = state.toStrings()[1].endsWith(".from");
    return (
      <AppBackContextProvider
        backHandler={() => {
          machine.send("BACK");
          return true;
        }}>
        <SelectOnMapView
          type={isFrom ? "from" : "to"}
          onSelect={p => machine.send("UPDATE", { data: { [isFrom ? "from" : "to"]: p } })}
          title={"Choisissez un point " + (isFrom ? "de départ" : "d'arrivée")}
        />
      </AppBackContextProvider>
    );
  }

  return (
    <Column style={{ flex: 1 }}>
      {(isOverviewStep || isSubmittingStep) && (
        <Animated.View
          exiting={SlideOutUp.duration(20)}
          entering={SlideInUp.delay(50).duration(300).springify().damping(20)}
          style={[styles.footerContainer, AppStyles.shadow, { marginTop: offsetsTop.returnStep, backgroundColor: AppColors.white, bottom: 0 }]}>
          {/*<AppPressableOverlay
            onPress={() => {
              machine.send("RETURN", { data: { returnTime: null } });
            }}>
            <Row style={{ paddingHorizontal: 16, alignItems: "center" }}>
              <AppIcon name={"plus-circle-outline"} />
              <AppText style={{ paddingHorizontal: 16 }}>Ajouter un retour</AppText>
            </Row>
          </AppPressableOverlay>*/}
        </Animated.View>
      )}

      {(isOverviewStep || isSubmittingStep || isReturnStep) && (
        <Animated.View
          exiting={SlideOutUp.duration(20)}
          entering={SlideInUp.delay(50).duration(300).springify().damping(20)}
          style={[styles.footerContainer, AppStyles.shadow, { marginTop: offsetsTop.returnStep, backgroundColor: AppColorPalettes.blue[100] }]}>
          <ReturnStepView
            after={state.context.request.departureTime!}
            editable={isReturnStep}
            animationType={state.context.request.returnTime === undefined ? "firstEntrance" : "ease"}
            onRequestEdit={() => machine.send("RETURN", { data: { returnTime: null } })}
            onChange={v => machine.send("UPDATE", { data: { returnTime: v } })}
            initialValue={state.context.request.returnTime}
          />
        </Animated.View>
      )}

      {!isTripStep && !isDateStep && (
        <Animated.View
          exiting={SlideOutUp.duration(20)}
          entering={SlideInUp.delay(50).duration(300).springify().damping(20)}
          style={[styles.footerContainer, AppStyles.shadow, { marginTop: offsetsTop.vehicleStep, backgroundColor: AppColors.blue }]}>
          <VehicleStepView
            animationType={step.value < 3 ? "firstEntrance" : "ease"}
            editable={isVehicleStep}
            initialValue={state.context.request.availableSeats}
            onRequestEdit={() => machine.send("EDIT", { data: "vehicle" })}
            onChange={d => {
              machine.send("NEXT", { data: { availableSeats: d } });
              nextStep(3);
            }}
          />
        </Animated.View>
      )}

      {!isTripStep && (
        <Animated.View
          exiting={SlideOutUp.duration(20)}
          entering={SlideInUp.duration(300).springify().damping(20)}
          style={[styles.footerContainer, AppStyles.shadow, { marginTop: offsetsTop.dateStep, backgroundColor: AppColors.yellow }]}>
          <DateStepView
            animationType={step.value < 3 ? "firstEntrance" : "ease"}
            editable={isDateStep}
            initialValue={{ date: state.context.request.departureTime, recurrence: state.context.request.recurrence }}
            onRequestEdit={() => machine.send("EDIT", { data: "date" })}
            onChange={data => {
              machine.send("NEXT", { data: { departureTime: data.date, recurrence: data.recurrence } });
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
        title={isTripStep ? "Où allez-vous?" : undefined}
        openMap={() => machine.send("MAP", { data: state.context.request.from ? "to" : "from" })}
      />
      <Animated.View style={[styles.stepperIndicatorBaseStyle, stepperIndicatorStyle]} />

      {(isOverviewStep || isSubmittingStep) && (
        <Animated.View entering={SlideInDown.springify().damping(20)} style={styles.overviewStepContainer}>
          <AppPressableOverlay
            disabled={isSubmittingStep}
            onPress={() => machine.send("PUBLISH")}
            style={styles.overviewStep}
            backgroundStyle={styles.overviewStepBackground}>
            <Row spacing={8}>
              <AppText style={styles.overviewStepText}>{isSubmittingStep ? "Publication" : "Publier le trajet"}</AppText>
              {isOverviewStep && <AppIcon name={"arrow-circle-right-outline"} color={AppColors.white} />}
              {isSubmittingStep && state.matches({ submitting: "pending" }) && <ActivityIndicator color={AppColors.white} />}
              {isSubmittingStep && state.matches({ submitting: "failure" }) && <AppIcon name={"refresh-outline"} color={AppColors.white} />}
            </Row>
          </AppPressableOverlay>
        </Animated.View>
      )}
    </Column>
  );
};

const DateStepView = ({
  editable,
  onChange,
  initialValue,
  onRequestEdit
}: StepProps<{ date: Date | undefined; recurrence: DayOfTheWeekFlag | null | undefined }>) => {
  const optionsRecurrentLiane = ["Date unique", "Trajet régulier"];
  const initialMinDate = new Date(new Date().getTime() + 10 * 60000);

  const [date, setDate] = useState(initialMinDate);
  const [isRecurrent, setIsRecurrent] = useState(!!initialValue?.recurrence);
  const [daysOfTheWeek, setDaysOfTheWeek] = useState<DayOfTheWeekFlag>(initialValue?.recurrence ?? "0000000");

  return (
    <Pressable disabled={editable} onPress={onRequestEdit}>
      <Column spacing={8}>
        {editable && (
          <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(280).duration(300).springify().damping(15)}>
            <AppText style={[AppStyles.title, styles.stepTitle]}>Quand partez-vous ?</AppText>
          </Animated.View>
        )}

        {!editable && (
          <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
            <Row style={styles.stepResumeContainer} spacing={8}>
              <AppIcon name={"clock-outline"} />
              {isRecurrent ? (
                <AppText style={styles.stepResume}>
                  Les {formatDaysOfTheWeek(daysOfTheWeek || "0000000")} à {formatTime(date)}
                </AppText>
              ) : (
                <AppText style={styles.stepResume}>Départ {toRelativeTimeString(date, formatMonthDay)}</AppText>
              )}
            </Row>
          </Animated.View>
        )}

        {editable && (
          <Center>
            <AppToggle
              defaultSelectedValue={optionsRecurrentLiane[isRecurrent ? 1 : 0]}
              options={optionsRecurrentLiane}
              selectionColor={AppColorPalettes.yellow[800]}
              onSelectValue={(option: string) => {
                setIsRecurrent(option !== optionsRecurrentLiane[0]);
              }}
            />
          </Center>
        )}

        {editable && !isRecurrent && (
          <Animated.View exiting={FadeOutLeft.delay(40).duration(150)} entering={SlideInLeft.delay(550).duration(300).springify().damping(20)}>
            <DatePagerSelector date={date} onSelectDate={setDate} />
          </Animated.View>
        )}

        {editable && isRecurrent && (
          <Animated.View exiting={FadeOutRight.delay(40).duration(150)} entering={SlideInRight.delay(550).duration(300).springify().damping(20)}>
            <DayOfTheWeekPicker selectedDays={daysOfTheWeek} onChangeDays={setDaysOfTheWeek} />
          </Animated.View>
        )}

        {editable && (
          <Animated.View exiting={FadeOutLeft.delay(50).duration(150)} entering={SlideInLeft.delay(650).duration(300).springify().damping(20)}>
            <TimeWheelPicker date={date} minuteStep={5} onChange={setDate} minDate={!isRecurrent ? initialMinDate : undefined} />
          </Animated.View>
        )}

        {editable && (
          <Row spacing={8} style={styles.validateContainer}>
            <AppPressableOverlay
              backgroundStyle={styles.validateButtonBackground}
              style={styles.validateButton}
              disabled={isRecurrent && daysOfTheWeek === "0000000"}
              onPress={() => {
                const departureTime = isRecurrent ? getFirstFutureDate(date, daysOfTheWeek) : date;
                onChange({ date: departureTime!, recurrence: isRecurrent ? daysOfTheWeek : null });
              }}>
              <Center>
                <Row spacing={4}>
                  <AppText>Valider</AppText>
                  <AppIcon size={20} name={"checkmark-outline"} />
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
  const [seats, setSeats] = useState(initialValue || 1);
  return (
    <Pressable disabled={editable} onPress={onRequestEdit}>
      <Column spacing={8}>
        {editable && (
          <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(600).duration(300).springify().damping(15)}>
            <AppText style={[AppStyles.title, styles.stepTitle, { color: AppColors.white }]}>Combien de places avez-vous ?</AppText>
          </Animated.View>
        )}
        {!editable && (
          <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
            <Row style={styles.stepResumeContainer} spacing={8}>
              <AppIcon name={seats > 0 ? "car" : "car-strike-through"} color={AppColors.white} />
              <AppText style={[styles.stepResume, { color: AppColors.white }]}>
                {/*Je suis {seats > 0 ? "conducteur" : "passager"}*/}
                {seats} places disponibles
              </AppText>
            </Row>
          </Animated.View>
        )}
        {/*editable && (
          <Animated.View entering={FadeIn.delay(1100)} style={{ alignSelf: "center" }}>
            <AppSwitchToggle
              defaultSelectedValue={seats > 0}
              options={[true, false]}
              selectionColor={AppColors.blue}
              onSelectValue={() => setSeats(-seats)}
            />
          </Animated.View>
        )*/}
        {editable && (
          <Animated.View entering={FadeInDown.delay(1100)}>
            <Column style={styles.flexStretch}>
              <View style={[styles.flexStretch, styles.monkeySmilingVectorContainer]}>
                <MonkeySmilingVector maxWidth={80} bodyColor={AppColorPalettes.blue[100]} />
              </View>
              <View style={styles.vehicleStepSeatsContainer}>
                <SeatsForm seats={seats} setSeats={setSeats} />
              </View>
            </Column>
          </Animated.View>
        )}
        {editable && (
          <Row spacing={8} style={styles.validateContainer}>
            <AppPressableOverlay backgroundStyle={styles.validateButtonBackground} style={styles.validateButton} onPress={() => onChange(seats)}>
              <Center>
                <Row spacing={4}>
                  <AppText>Valider</AppText>
                  <AppIcon size={20} name={"checkmark-outline"} />
                </Row>
              </Center>
            </AppPressableOverlay>
          </Row>
        )}
      </Column>
    </Pressable>
  );
};

const ReturnStepView = ({ editable, onChange, initialValue: initialDate, onRequestEdit, after }: StepProps<Date | null> & { after: Date }) => {
  const [date, setDate] = useState(initialDate);
  const initialMinDate = new Date(after.getTime() + 60000);
  return (
    <Pressable disabled={editable} onPress={onRequestEdit}>
      <Column spacing={8}>
        {editable && (
          <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(280).duration(300).springify().damping(15)}>
            <AppText style={[AppStyles.title, styles.stepTitle]}>Quand repartez-vous ?</AppText>
          </Animated.View>
        )}
        {!editable && (
          <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
            <Row style={styles.stepResumeContainer} spacing={8}>
              <AppIcon name={"corner-down-right-outline"} />
              <AppText style={styles.stepResume}>{date ? "Retour à " + formatTime(date) : "Pas de retour"}</AppText>
            </Row>
          </Animated.View>
        )}

        {editable && (
          <Animated.View exiting={FadeOutLeft.delay(50).duration(150)} entering={SlideInLeft.delay(650).duration(300).springify().damping(20)}>
            <TimeWheelPicker date={date || after} minuteStep={5} onChange={setDate} minDate={initialMinDate} />
          </Animated.View>
        )}

        {editable && (
          <Row spacing={8} style={styles.validateContainer}>
            <AppPressableOverlay
              backgroundStyle={styles.validateButtonBackground}
              style={styles.validateButton}
              onPress={() => onChange(date || null)}>
              <Center>
                <Row spacing={4}>
                  <AppText>Annuler</AppText>
                  <AppIcon size={20} name={"close-outline"} />
                </Row>
              </Center>
            </AppPressableOverlay>
            <AppPressableOverlay
              backgroundStyle={styles.validateButtonBackground}
              style={styles.validateButton}
              onPress={() => onChange(date || null)}>
              <Center>
                <Row spacing={4}>
                  <AppText>Valider</AppText>
                  <AppIcon size={20} name={"checkmark-outline"} />
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
  page: {
    flex: 1,
    padding: 16
  },
  stepperIndicatorBaseStyle: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 4,
    borderTopRightRadius: 16,
    backgroundColor: AppColors.orange
  },
  floatingSearchBar: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    position: "absolute",
    width: "100%"
  },
  actionButton: {
    padding: 12,
    borderRadius: 52
  },
  smallActionButton: {
    padding: 8,
    borderRadius: 52
  },
  floatingBackButton: {
    margin: 24,
    position: "absolute",
    backgroundColor: AppColors.darkBlue
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: "bold"
  },
  stepTitle: {
    marginVertical: 8,
    paddingLeft: 8
  },
  stepResumeContainer: {
    paddingLeft: 8,
    paddingBottom: 8
  },
  stepResume: {
    fontSize: 18,
    paddingLeft: 8,
    alignSelf: "center",
    textAlignVertical: "center"
  },
  validateContainer: {
    justifyContent: "flex-end",
    paddingHorizontal: 8
  },
  validateButtonBackground: {
    borderRadius: 32
  },
  validateButton: {
    padding: 8
  },
  overviewStepContainer: {
    position: "absolute",
    bottom: 0,
    right: 0
  },
  overviewStep: {
    paddingVertical: 16,
    paddingLeft: 24,
    paddingRight: 16
  },
  overviewStepBackground: {
    borderTopLeftRadius: 24,
    backgroundColor: AppColors.orange
  },
  overviewStepText: {
    fontSize: 18,
    color: AppColors.white
  },
  footerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexShrink: 1,
    paddingBottom: 8,
    backgroundColor: AppColors.darkBlue,
    alignSelf: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 8,
    paddingTop: 40
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
  vehicleStepSeatsContainer: { marginHorizontal: 16 }
});
