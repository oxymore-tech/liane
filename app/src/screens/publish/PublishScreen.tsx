import { ActivityIndicator, Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import React, { useContext, useState } from "react";
import { AppContext } from "@/components/ContextProvider";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { AppStyles } from "@/theme/styles";
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
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { DatePagerSelector, TimeWheelPicker } from "@/components/DatePagerSelector";
import { AppToggle } from "@/components/base/AppOptionToggle";
import { useActor, useInterpret } from "@xstate/react";
import { CreatePublishLianeMachine, PublishLianeContext } from "@/screens/publish/StateMachine";
import { ItinerarySearchForm } from "@/screens/ItinerarySearchForm";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { formatMonthDay, toRelativeTimeString } from "@/api/i18n";
import { MonkeySmilingVector } from "@/components/vectors/MonkeySmilingVector";
import { LianeQueryKey } from "@/screens/user/MyTripsScreen";
import { useQueryClient } from "react-query";
import { useAppNavigation } from "@/api/navigation";
import { SeatsForm } from "@/components/forms/SeatsForm";
import { SelectOnMapView } from "@/screens/publish/SelectOnMapView";
import { AppBackContextProvider } from "@/components/AppBackContextProvider";
import { AppStatusBar } from "@/components/base/AppStatusBar";

export const PublishScreenView = () => {
  const insets = useSafeAreaInsets();
  const machine = useContext(PublishLianeContext);
  const [state] = useActor(machine);

  const isTripStep = state.matches("trip");
  const isDateStep = state.matches("date");
  const isVehicleStep = state.matches("vehicle");
  const isOverviewStep = state.matches("overview");
  const isSubmittingStep = state.matches("submitting");
  console.log(state.value, state.context.request);

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
          onSelect={p => {
            machine.send("UPDATE", { data: { [isFrom ? "from" : "to"]: p } });
          }}
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
          style={[
            styles.footerContainer,
            AppStyles.shadow,
            { paddingTop: 24 + 16, marginTop: insets.top + 160 - 24 * 3 + 80 * 2, backgroundColor: AppColors.white, bottom: 0 }
          ]}
        />
      )}
      {!isTripStep && !isDateStep && (
        <Animated.View
          exiting={SlideOutUp.duration(20)}
          entering={SlideInUp.delay(50).duration(300).springify().damping(20)}
          style={[
            styles.footerContainer,
            AppStyles.shadow,
            { paddingTop: 24 + 16, marginTop: insets.top + 160 - 24 * 2 + 80, backgroundColor: AppColors.blue }
          ]}>
          <VehicleStepView
            animationType={step.value < 3 ? "firstEntrance" : "ease"}
            editable={isVehicleStep}
            initialValue={state.context.request.availableSeats}
            onRequestEdit={() => {
              machine.send("EDIT", { data: "vehicle" });
            }}
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
          style={[
            styles.footerContainer,
            AppStyles.shadow,
            { paddingTop: 24 + 16, marginTop: insets.top + 160 - 24, backgroundColor: AppColors.yellow }
          ]}>
          <DateStepView
            animationType={step.value < 3 ? "firstEntrance" : "ease"}
            editable={isDateStep}
            initialValue={state.context.request.departureTime}
            onRequestEdit={() => {
              machine.send("EDIT", { data: "date" });
            }}
            onChange={d => {
              machine.send("NEXT", { data: { departureTime: d } });
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
        openMap={() => {
          machine.send("MAP", { data: state.context.request.from ? "to" : "from" });
        }}
      />
      <Animated.View
        style={[
          { position: "absolute", bottom: 0, left: 0, height: 4, borderTopRightRadius: 16, backgroundColor: AppColors.orange },
          stepperIndicatorStyle
        ]}
      />
      {(isOverviewStep || isSubmittingStep) && (
        <Animated.View entering={SlideInDown.springify().damping(20)} style={{ position: "absolute", bottom: 0, right: 0 }}>
          <AppPressableOverlay
            disabled={isSubmittingStep}
            onPress={() => {
              machine.send("PUBLISH");
            }}
            style={{ paddingVertical: 16, paddingLeft: 24, paddingRight: 16 }}
            backgroundStyle={{ borderTopLeftRadius: 24, backgroundColor: AppColors.orange }}>
            <Row spacing={8}>
              <AppText style={{ fontSize: 18, color: AppColors.white }}>{isSubmittingStep ? "Publication" : "Publier le trajet"}</AppText>
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

const VehicleStepView = ({ editable, onChange, initialValue, onRequestEdit }: StepProps<number>) => {
  const [seats, setSeats] = useState(initialValue || 1);
  return (
    <Pressable disabled={editable} onPress={onRequestEdit}>
      <Column spacing={8}>
        {editable && (
          <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(600).duration(300).springify().damping(15)}>
            <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8, color: AppColors.white }}>Combien de places avez-vous ?</AppText>
          </Animated.View>
        )}
        {!editable && (
          <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
            <Row style={{ paddingLeft: 8, paddingBottom: 8 }} spacing={8}>
              <AppIcon name={seats > 0 ? "car" : "car-strike-through"} color={AppColors.white} />
              <AppText
                style={{
                  fontSize: 18,
                  paddingLeft: 8,
                  alignSelf: "center",
                  textAlignVertical: "center",
                  color: AppColors.white
                }}>
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
            <Column style={{ alignSelf: "stretch" }}>
              <View style={{ position: "relative", top: 10, left: 32, alignItems: "stretch" }}>
                <MonkeySmilingVector maxWidth={80} bodyColor={AppColorPalettes.blue[100]} />
              </View>
              <View style={{ marginHorizontal: 16 }}>
                <SeatsForm seats={seats} setSeats={setSeats} />
              </View>
            </Column>
          </Animated.View>
        )}
        {editable && (
          <Row spacing={8} style={{ justifyContent: "flex-end", paddingHorizontal: 8 }}>
            <AppPressableOverlay
              backgroundStyle={{ borderRadius: 32 }}
              style={{ padding: 8 }}
              onPress={() => {
                onChange(seats);
              }}>
              <AppIcon size={20} name={"checkmark-outline"} color={AppColors.white} />
            </AppPressableOverlay>
          </Row>
        )}
      </Column>
    </Pressable>
  );
};

interface StepProps<T> {
  editable: boolean;
  onChange: (v: T) => void;
  initialValue: T | undefined;
  onRequestEdit: () => void;
  animationType: "firstEntrance" | "ease";
}

const DateStepView = ({ editable, onChange, initialValue: initialDate, onRequestEdit }: StepProps<Date>) => {
  const [date, setDate] = useState(initialDate || new Date());

  return (
    <Pressable disabled={editable} onPress={onRequestEdit}>
      <Column spacing={8}>
        {editable && (
          <Animated.View exiting={SlideOutLeft.duration(300)} entering={SlideInLeft.delay(280).duration(300).springify().damping(15)}>
            <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8 }}>Quand partez-vous ?</AppText>
          </Animated.View>
        )}
        {!editable && (
          <Animated.View exiting={FadeOutRight.duration(300)} entering={FadeIn.duration(300).springify().damping(15)}>
            <Row style={{ paddingLeft: 8, paddingBottom: 8 }} spacing={8}>
              <AppIcon name={"clock-outline"} />
              <AppText
                style={{
                  fontSize: 18,
                  paddingLeft: 8,
                  alignSelf: "center",
                  textAlignVertical: "center"
                }}>
                Départ {toRelativeTimeString(date, formatMonthDay)}
              </AppText>
            </Row>
          </Animated.View>
        )}

        {false && (
          <View style={{ alignSelf: "center" }}>
            <AppToggle
              defaultSelectedValue={"Date unique"}
              options={["Date unique", "Trajet régulier"]}
              selectionColor={AppColorPalettes.yellow[800]}
              onSelectValue={_ => {}}
            />
          </View>
        )}

        {editable && (
          <Animated.View exiting={FadeOutRight.delay(40).duration(150)} entering={SlideInRight.delay(550).duration(300).springify().damping(20)}>
            <DatePagerSelector date={date} onSelectDate={setDate} />
          </Animated.View>
        )}

        {false && (
          <View style={{ alignSelf: "center" }}>
            <AppToggle
              defaultSelectedValue={"Heure fixe"}
              options={["Heure fixe", "Plage horaire"]}
              selectionColor={AppColorPalettes.yellow[800]}
              onSelectValue={_ => {}}
            />
          </View>
        )}

        {editable && (
          <Animated.View exiting={FadeOutLeft.delay(50).duration(150)} entering={SlideInLeft.delay(650).duration(300).springify().damping(20)}>
            <TimeWheelPicker date={date} minuteStep={5} onChange={setDate} />
          </Animated.View>
        )}

        {editable && (
          <Row spacing={8} style={{ justifyContent: "flex-end", paddingHorizontal: 8 }}>
            <AppPressableOverlay
              backgroundStyle={{ borderRadius: 32 }}
              style={{ padding: 8 }}
              onPress={() => {
                onChange(date);
              }}>
              <AppIcon size={20} name={"checkmark-outline"} />
            </AppPressableOverlay>
          </Row>
        )}
      </Column>
    </Pressable>
  );
};
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
        availableSeats: ctx.request.availableSeats!
      });
      console.log(ctx, liane);
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

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16
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
    paddingHorizontal: 8
  },
  inputContainer: {
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  }
});
