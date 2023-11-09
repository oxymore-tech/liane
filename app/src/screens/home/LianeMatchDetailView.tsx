import React, { PropsWithChildren, useCallback, useContext, useEffect, useState } from "react";
import { HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import { capitalize, Exact, getPoint, JoinRequest, UnionUtils } from "@liane/common";
import { getTotalDuration, getTripMatch } from "@/components/trip/trip";
import { AppLocalization } from "@/api/i18n";
import { AppBottomSheetScrollView } from "@/components/base/AppBottomSheet";
import { Column, Row, Space } from "@/components/base/AppLayout";
import { LineSeparator } from "@/components/Separator";
import { View } from "react-native";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { SeatsForm } from "@/components/forms/SeatsForm";
import { JoinRequestsQueryKey } from "@/screens/user/MyTripsScreen";
import { AppContext } from "@/components/context/ContextProvider";
import { useQueryClient } from "react-query";
import { useAppNavigation } from "@/api/navigation";
import { AppText } from "@/components/base/AppText";
import { AppStyles } from "@/theme/styles";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { LianeMatchItemView } from "@/screens/home/BottomSheetView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideOutDown,
  SlideOutLeft
} from "react-native-reanimated";
import { AppPressable, AppPressableOverlay } from "@/components/base/AppPressable";
import { DriverInfo } from "@/screens/detail/components/DriverInfo";
import { AppExpandingTextInput } from "@/components/base/AppExpandingTextInput";
import { AppStorage } from "@/api/storage";

const StepView = ({
  displayFull,
  onValidate,
  onCancel,
  animateSummary = true,
  onEdit,
  summary,
  icon,
  children
}: {
  displayFull?: boolean | null | undefined;
  onValidate: () => void;
  onCancel?: () => void | undefined;
  animateSummary?: boolean;
  onEdit?: () => void | undefined;
  summary: string;
  icon: IconName;
} & PropsWithChildren) => {
  return (
    <Animated.View
      entering={SlideInRight}
      style={{ borderColor: AppColors.primaryColor, borderRadius: 8, borderWidth: 2, marginVertical: 2, marginHorizontal: 8 }}>
      {displayFull === true && (
        <Column style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
          {children}

          <Row style={{ justifyContent: "flex-end", marginTop: 8 }} spacing={16}>
            {onCancel && (
              <AppPressableOverlay backgroundStyle={{ borderRadius: 32 }} style={{ padding: 8 }} onPress={onCancel}>
                <Row spacing={4} style={{ alignItems: "center" }}>
                  <AppText>Non</AppText>
                  <AppIcon size={20} name={"close-outline"} />
                </Row>
              </AppPressableOverlay>
            )}
            {!onCancel && <Space />}
            <AppPressableOverlay backgroundStyle={{ borderRadius: 32 }} style={{ padding: 8 }} onPress={onValidate}>
              <Row spacing={4} style={{ alignItems: "center" }}>
                <AppText>{onCancel ? "Oui" : "Valider"}</AppText>
                <AppIcon size={20} name={"checkmark-outline"} />
              </Row>
            </AppPressableOverlay>
          </Row>
        </Column>
      )}
      {displayFull === false && (
        <Animated.View exiting={animateSummary ? undefined : FadeOut} entering={FadeIn}>
          <AppPressable onPress={onEdit}>
            <Row style={{ paddingHorizontal: 24, paddingVertical: 16 }} spacing={8}>
              <AppIcon name={icon} />
              <AppText
                style={{
                  fontSize: 16,
                  paddingLeft: 4,
                  alignSelf: "center",
                  textAlignVertical: "center"
                }}>
                {summary}
              </AppText>
              <Space />
              {onEdit && <AppIcon name={"edit-2-outline"} />}
            </Row>
          </AppPressable>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const spaceRegExp = /\s+/g;
export const LianeMatchDetailView = () => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const { services, user } = useContext(AppContext);
  const queryClient = useQueryClient();
  const { navigation } = useAppNavigation();
  const liane = state.context.selectedMatch!;
  const lianeIsExactMatch = UnionUtils.isInstanceOf<Exact>(liane.match, "Exact");

  const fromPoint = getPoint(liane, "pickup");
  const toPoint = getPoint(liane, "deposit");
  const wayPoints = lianeIsExactMatch ? liane.liane.wayPoints : liane.match.wayPoints;

  const tripMatch = getTripMatch(toPoint, fromPoint, liane.liane.wayPoints, liane.liane.departureTime, wayPoints);

  const formattedDepartureTime = capitalize(AppLocalization.formatMonthDay(new Date(liane.liane.departureTime)));

  const currentTrip = tripMatch.wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1);
  const tripDuration = AppLocalization.formatDuration(getTotalDuration(currentTrip.slice(1)));

  const [message, setMessage] = useState("");
  const [seats, setSeats] = useState(liane.freeSeatsCount > 0 ? -1 : 1);
  const [step, setStep] = useState(0);
  const [firstEdit, setFirstEdit] = useState(true);
  const [takeReturnTrip, setTakeReturnTrip] = useState(false);

  const driver = liane.liane.members.find(m => m.user.id === liane.liane.driver.user)!.user;

  const userIsMember = liane.liane.members.findIndex(m => m.user.id === user!.id) >= 0;
  const requestJoin = async () => {
    const geolocationLevel = await AppStorage.getSetting("geolocation");
    const unresolvedRequest: JoinRequest = {
      type: "JoinRequest",
      from: fromPoint.id!,
      message,
      seats: seats,
      liane: liane.liane.id!,
      takeReturnTrip,
      to: toPoint.id!,
      geolocationLevel: geolocationLevel || "None"
    };

    const r = { ...unresolvedRequest, message: message };
    await services.liane.join(r);
    await queryClient.invalidateQueries(JoinRequestsQueryKey);
    // setModalVisible(false);
    machine.send(["BACK", "BACK", "BACK"]);
    //@ts-ignore
    navigation.navigate("Home", { screen: "Mes trajets" });
  };
  const isReturnStep = step === 2 && !!liane.returnTime;
  const isSeatsStep = step === 1 && liane.freeSeatsCount > 1;
  const isMessageStep = step === 4;
  const nextStep = useCallback(() => {
    setStep(firstEdit ? step + 1 : 3);
  }, [firstEdit, step]);
  useEffect(() => {
    //console.log(step, isSeatsStep, isReturnStep);
    if (step === 1 && !isSeatsStep) {
      nextStep();
    } else if (step === 2 && !isReturnStep) {
      nextStep();
    } else if (step === 3 && firstEdit) {
      setFirstEdit(false);
    }
  }, [firstEdit, isReturnStep, isSeatsStep, nextStep, step]);
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12 }}>
      <AppBottomSheetScrollView style={{ marginBottom: 52 }}>
        <Column style={{ paddingVertical: 8, paddingHorizontal: 24 }} spacing={6}>
          <AppText style={{ fontWeight: "bold", fontSize: 20, marginBottom: 8 }}>{formattedDepartureTime}</AppText>

          <LianeMatchItemView
            duration={tripDuration}
            from={wayPoints[tripMatch.departureIndex]}
            to={wayPoints[tripMatch.arrivalIndex]}
            freeSeatsCount={liane.freeSeatsCount}
            returnTime={liane.returnTime} /*TODO*/
          />
        </Column>

        {liane.liane.driver.canDrive && step === 0 && (
          <Animated.View exiting={SlideOutLeft}>
            <DriverInfo user={driver} />
          </Animated.View>
        )}

        {(step >= 1 || !firstEdit) && (
          <StepView
            displayFull={isSeatsStep || (step > 1 || !firstEdit ? false : null)}
            onValidate={nextStep}
            animateSummary={firstEdit}
            onEdit={liane.freeSeatsCount > 1 ? () => setStep(1) : undefined}
            summary={Math.abs(seats) + " passager" + (Math.abs(seats) > 1 ? "s" : "")}
            icon={"people-outline"}>
            <Animated.View entering={firstEdit ? undefined : SlideInLeft}>
              <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8 }}>Combien de places réservez vous ?</AppText>
            </Animated.View>
            <Animated.View entering={firstEdit ? undefined : FadeInDown}>
              <SeatsForm seats={seats} setSeats={setSeats} maxSeats={liane.freeSeatsCount} />
            </Animated.View>
          </StepView>
        )}

        {/*(step > 1 || !firstEdit) && (
          <Animated.View entering={FadeIn}>
            <LineSeparator />
          </Animated.View>
        )*/}

        {(step >= 2 || !firstEdit) && !!liane.returnTime && (
          <StepView
            displayFull={isReturnStep || (step > 2 || !firstEdit ? false : null)}
            onValidate={() => {
              setTakeReturnTrip(true);
              nextStep();
            }}
            onCancel={() => {
              setTakeReturnTrip(false);
              nextStep();
            }}
            animateSummary={firstEdit}
            onEdit={liane.returnTime ? () => setStep(2) : undefined}
            summary={
              takeReturnTrip
                ? "Retour " + AppLocalization.toRelativeTimeString(new Date(liane.returnTime), AppLocalization.formatTime)
                : "Aller simple"
            }
            icon={"corner-down-right-outline"}>
            <Animated.View entering={firstEdit ? undefined : SlideInLeft}>
              <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8 }} numberOfLines={2}>
                Voulez vous effectuer le trajet retour {AppLocalization.toRelativeTimeString(new Date(liane.returnTime), AppLocalization.formatTime)}?
              </AppText>
            </Animated.View>
          </StepView>
        )}

        {(step >= 3 || !firstEdit) && (
          <StepView
            displayFull={isMessageStep || (step >= 3 || !firstEdit ? false : null)}
            onValidate={() => {
              nextStep();
            }}
            animateSummary={firstEdit}
            onEdit={() => setStep(4)}
            summary={message.length > 0 ? message.replaceAll(spaceRegExp, " ") : "Ajouter un message..."}
            icon={message.length > 0 ? "message-square" : "message-square-outline"}>
            <Animated.View entering={firstEdit ? undefined : FadeInUp}>
              <AppExpandingTextInput
                backgroundStyle={{
                  backgroundColor: AppColorPalettes.gray[100],
                  marginHorizontal: 4,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4
                }}
                value={message}
                onChangeText={setMessage}
                placeholder={"Ajouter un message..."}
                style={{
                  fontSize: 16
                }}
              />
            </Animated.View>
          </StepView>
        )}
        {step === 3 && (
          <Animated.View entering={FadeIn}>
            <LineSeparator />
          </Animated.View>
        )}
        {step === 3 && (
          <Animated.View entering={SlideInRight}>
            <Row style={{ paddingHorizontal: 24, paddingVertical: 16 }} spacing={8}>
              <AppText
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  paddingLeft: 4,
                  alignSelf: "center",
                  textAlignVertical: "center"
                }}>
                Prix total : {5 * Math.abs(seats)} €
              </AppText>
            </Row>
          </Animated.View>
        )}

        {userIsMember && <AppText style={{ marginHorizontal: 24 }}>Vous êtes membre de cette liane.</AppText>}
      </AppBottomSheetScrollView>

      <Animated.View
        entering={SlideInDown}
        exiting={SlideOutDown}
        style={{ paddingHorizontal: 24, position: "absolute", bottom: 80 + insets.bottom, left: 0, right: 0 }}>
        {!userIsMember && !isReturnStep && !isSeatsStep && !isMessageStep && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <AppRoundedButton
              color={defaultTextColor(AppColors.primaryColor)}
              //onPress={requestJoin}
              onPress={
                step === 0
                  ? nextStep
                  : () => {
                      requestJoin().catch(e => console.warn(e));
                    }
              }
              backgroundColor={AppColors.primaryColor}
              text={step === 0 ? "Rejoindre cette liane" : "Réserver ce trajet"}
            />
          </Animated.View>
        )}
        {!userIsMember && (isReturnStep || isSeatsStep || isMessageStep) && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <AppRoundedButton
              color={"black"}
              //onPress={requestJoin}
              onPress={() => setStep(0)}
              backgroundColor={AppColorPalettes.gray[300]}
              text={"Annuler"}
            />
          </Animated.View>
        )}
        {userIsMember && (
          <AppRoundedButton color={"black"} backgroundColor={AppColorPalettes.gray[300]} enabled={false} text={"Vous êtes membre de cette liane"} />
        )}
      </Animated.View>
    </View>
  );
};
