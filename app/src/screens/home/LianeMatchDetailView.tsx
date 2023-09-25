import React, { useCallback, useContext, useEffect, useState } from "react";
import { HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import { Exact, getPoint, UnionUtils } from "@/api";
import { getTotalDuration, getTripMatch } from "@/components/trip/trip";
import { capitalize } from "@/util/strings";
import { formatMonthDay, formatTime, toRelativeTimeString } from "@/api/i18n";
import { AppBottomSheetScrollView } from "@/components/base/AppBottomSheet";
import { Column, Row } from "@/components/base/AppLayout";
import { LineSeparator, SectionSeparator } from "@/components/Separator";
import { View } from "react-native";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { formatDuration } from "@/util/datetime";
import { SeatsForm } from "@/components/forms/SeatsForm";
import { JoinRequestsQueryKey } from "@/screens/user/MyTripsScreen";
import { AppContext } from "@/components/context/ContextProvider";
import { useQueryClient } from "react-query";
import { JoinRequest } from "@/api/event";
import { useAppNavigation } from "@/api/navigation";
import { AppText } from "@/components/base/AppText";
import { AppStyles } from "@/theme/styles";
import { AppIcon } from "@/components/base/AppIcon";
import { LianeMatchItemView } from "@/screens/home/BottomSheetView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInDown, SlideInLeft, SlideInRight, SlideOutDown, SlideOutLeft } from "react-native-reanimated";
import { AppPressable, AppPressableOverlay } from "@/components/base/AppPressable";
import { DriverInfo } from "@/screens/detail/components/DriverInfo";

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

  const formattedDepartureTime = capitalize(formatMonthDay(new Date(liane.liane.departureTime)));

  const currentTrip = tripMatch.wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1);
  const tripDuration = formatDuration(getTotalDuration(currentTrip.slice(1)));

  const [message, setMessage] = useState("");
  const [seats, setSeats] = useState(liane.freeSeatsCount > 0 ? -1 : 1);
  const [step, setStep] = useState(0);
  const [firstEdit, setFirstEdit] = useState(true);
  const [takeReturnTrip, setTakeReturnTrip] = useState(false);

  const driver = liane.liane.members.find(m => m.user.id === liane.liane.driver.user)!.user;

  const userIsMember = liane.liane.members.findIndex(m => m.user.id === user!.id) >= 0;
  const requestJoin = async () => {
    const unresolvedRequest: JoinRequest = {
      type: "JoinRequest",
      from: fromPoint.id!,
      message,
      seats: seats,
      liane: liane.liane.id!,
      takeReturnTrip,
      to: toPoint.id!
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
  }, [firstEdit, isReturnStep, isSeatsStep, nextStep, requestJoin, step]);
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
          <Animated.View entering={SlideInRight} style={{ backgroundColor: isSeatsStep ? AppColorPalettes.blue[100] : undefined }}>
            {isSeatsStep && (
              <Column style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                <Animated.View entering={firstEdit ? undefined : SlideInLeft}>
                  <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8 }}>Combien de places réservez vous ?</AppText>
                </Animated.View>
                <Animated.View entering={firstEdit ? undefined : FadeInDown}>
                  <SeatsForm seats={seats} setSeats={setSeats} maxSeats={liane.freeSeatsCount} />
                </Animated.View>
                <Row style={{ justifyContent: "flex-end", marginTop: 8 }}>
                  <AppPressableOverlay backgroundStyle={{ borderRadius: 32 }} style={{ padding: 8 }} onPress={nextStep}>
                    <Row spacing={4} style={{ alignItems: "center" }}>
                      <AppText>Valider</AppText>
                      <AppIcon size={20} name={"checkmark-outline"} />
                    </Row>
                  </AppPressableOverlay>
                </Row>
              </Column>
            )}
            {(step > 1 || !firstEdit) && !isSeatsStep && (
              <Animated.View exiting={firstEdit ? undefined : FadeOut} entering={FadeIn}>
                <AppPressable onPress={() => setStep(liane.freeSeatsCount > 1 ? 1 : step)}>
                  <Row style={{ paddingHorizontal: 24, paddingVertical: 16 }} spacing={8}>
                    <AppIcon name={"people-outline"} />
                    <AppText
                      style={{
                        fontSize: 16,
                        paddingLeft: 4,
                        alignSelf: "center",
                        textAlignVertical: "center"
                      }}>
                      {Math.abs(seats) + " passager" + (Math.abs(seats) > 1 ? "s" : "")}
                    </AppText>
                  </Row>
                </AppPressable>
              </Animated.View>
            )}
          </Animated.View>
        )}
        {(step > 1 || !firstEdit) && (
          <Animated.View entering={FadeIn}>
            <LineSeparator />
          </Animated.View>
        )}

        {(step >= 2 || !firstEdit) && !!liane.returnTime && (
          <Animated.View entering={SlideInRight} style={{ backgroundColor: isReturnStep ? AppColorPalettes.blue[100] : undefined }}>
            {isReturnStep && (
              <Column style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                <Animated.View entering={firstEdit ? undefined : SlideInLeft}>
                  <AppText style={{ ...AppStyles.title, marginVertical: 8, paddingLeft: 8 }} numberOfLines={2}>
                    Voulez vous effectuer le trajet retour {toRelativeTimeString(new Date(liane.returnTime), formatTime)}?
                  </AppText>
                </Animated.View>

                <Row style={{ justifyContent: "flex-end", marginTop: 8 }} spacing={16}>
                  <AppPressableOverlay
                    backgroundStyle={{ borderRadius: 32 }}
                    style={{ padding: 8 }}
                    onPress={() => {
                      setTakeReturnTrip(false);
                      nextStep();
                    }}>
                    <Row spacing={4} style={{ alignItems: "center" }}>
                      <AppText>Non</AppText>
                      <AppIcon size={20} name={"close-outline"} />
                    </Row>
                  </AppPressableOverlay>
                  <AppPressableOverlay
                    backgroundStyle={{ borderRadius: 32 }}
                    style={{ padding: 8 }}
                    onPress={() => {
                      setTakeReturnTrip(true);
                      nextStep();
                    }}>
                    <Row spacing={4} style={{ alignItems: "center" }}>
                      <AppText>Oui</AppText>
                      <AppIcon size={20} name={"checkmark-outline"} />
                    </Row>
                  </AppPressableOverlay>
                </Row>
              </Column>
            )}
            {(step > 2 || !firstEdit) && !isReturnStep && (
              <Animated.View exiting={firstEdit ? undefined : FadeOut} entering={FadeIn}>
                <AppPressable onPress={() => setStep(liane.returnTime ? 2 : step)}>
                  <Row style={{ paddingHorizontal: 24, paddingVertical: 16 }} spacing={8}>
                    <AppIcon name={"corner-down-right-outline"} />
                    <AppText
                      style={{
                        fontSize: 16,
                        paddingLeft: 4,
                        alignSelf: "center",
                        textAlignVertical: "center"
                      }}>
                      {takeReturnTrip ? "Retour " + toRelativeTimeString(new Date(liane.returnTime), formatTime) : "Aller simple"}
                    </AppText>
                  </Row>
                </AppPressable>
              </Animated.View>
            )}
          </Animated.View>
        )}
        {(step > 2 || !firstEdit) && !!liane.returnTime && (
          <Animated.View entering={FadeIn}>
            <LineSeparator />
          </Animated.View>
        )}
        {(step > 2 || !firstEdit) && (
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
        style={{ paddingHorizontal: 24, position: "absolute", bottom: 4 + insets.bottom, left: 0, right: 0 }}>
        {!userIsMember && !isReturnStep && !isSeatsStep && (
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
        {!userIsMember && (isReturnStep || isSeatsStep) && (
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
