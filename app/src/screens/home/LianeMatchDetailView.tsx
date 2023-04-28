import React, { useContext, useState } from "react";
import { HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import { Exact, getPoint, UnionUtils } from "@/api";
import { getTotalDistance, getTotalDuration, getTripMatch } from "@/components/trip/trip";
import { capitalize } from "@/util/strings";
import { formatMonthDay } from "@/api/i18n";
import { AppBottomSheetScrollView } from "@/components/base/AppBottomSheet";
import { Column, Row } from "@/components/base/AppLayout";
import { DetailedLianeMatchView } from "@/components/trip/WayPointsView";
import { LineSeparator, SectionSeparator } from "@/components/Separator";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { formatDuration } from "@/util/datetime";
import Modal from "react-native-modal/dist/modal";
import { CardTextInput } from "@/components/base/CardTextInput";
import { SeatsForm } from "@/components/forms/SeatsForm";
import { JoinRequestsQueryKey } from "@/screens/MyTripsScreen";
import { AppContext } from "@/components/ContextProvider";
import { useQueryClient } from "react-query";
import { DriverInfo, InfoItem } from "@/screens/detail/Components";
import { JoinRequest } from "@/api/event";

const formatSeatCount = (seatCount: number) => {
  let count = seatCount;
  let words: string[];
  if (seatCount > 0) {
    // offered seats
    words = ["place", "disponible"];
  } else {
    // passengers
    count = -seatCount;
    words = ["passager"];
  }
  return `${count} ${words.map(word => word + (count > 1 ? "s" : "")).join(" ")}`;
};

export const LianeMatchDetailView = () => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const { services } = useContext(AppContext);
  const queryClient = useQueryClient();
  const liane = state.context.selectedMatch!;
  const lianeIsExactMatch = UnionUtils.isInstanceOf<Exact>(liane.match, "Exact");

  const fromPoint = getPoint(liane, "pickup");
  const toPoint = getPoint(liane, "deposit");
  const wayPoints = lianeIsExactMatch ? liane.liane.wayPoints : liane.match.wayPoints;

  const tripMatch = getTripMatch(toPoint, fromPoint, liane.liane.wayPoints, liane.liane.departureTime, wayPoints);

  const formattedDepartureTime = capitalize(formatMonthDay(new Date(liane.liane.departureTime)));
  const formattedSeatCount = formatSeatCount(liane.freeSeatsCount);

  // const passengers = liane.liane.members.filter(m => m.user !== liane.liane.driver.user);
  const currentTrip = tripMatch.wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1);
  const tripDuration = formatDuration(getTotalDuration(currentTrip));
  const tripDistance = Math.ceil(getTotalDistance(currentTrip) / 1000) + " km";

  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [seats, setSeats] = useState(1);

  const requestJoin = async () => {
    const unresolvedRequest: JoinRequest = {
      _t: "JoinRequest",
      from: fromPoint.id!,
      message,
      seats: seats,
      liane: liane.liane.id!,
      takeReturnTrip: false,
      to: toPoint.id!
    };
    const r = { ...unresolvedRequest, message: message };
    await services.liane.join(r);
    await queryClient.invalidateQueries(JoinRequestsQueryKey);
    //  navigation.navigate("Home", { screen: "Mes trajets" });
  };

  console.log(JSON.stringify(liane));
  return (
    <AppBottomSheetScrollView>
      <Column style={styles.section}>
        <DetailedLianeMatchView
          departureTime={liane.liane.departureTime}
          wayPoints={wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1)}
        />
      </Column>
      <SectionSeparator />

      <Column style={styles.section} spacing={4}>
        <InfoItem icon={"calendar-outline"} value={formattedDepartureTime} />
        <InfoItem icon={"clock-outline"} value={tripDuration + " (Estimée)"} />
        <InfoItem icon={"twisting-arrow"} value={tripDistance} />
      </Column>

      <LineSeparator />

      {liane.liane.driver.canDrive && <DriverInfo />}
      <SectionSeparator />

      <Row
        style={[
          styles.section,
          {
            justifyContent: "space-between",
            alignItems: "center",
            marginVertical: 16,
            borderLeftWidth: 4,
            borderLeftColor: AppColorPalettes.orange[400],
            paddingLeft: 8,
            paddingVertical: 0
          }
        ]}>
        <InfoItem icon={"people-outline"} value={formattedSeatCount} />

        <AppRoundedButton
          backgroundColor={AppColors.orange}
          text={"Rejoindre"}
          onPress={() => {
            setModalVisible(true);
          }}
        />
      </Row>
      <Modal isVisible={modalVisible} onSwipeComplete={() => setModalVisible(false)} swipeDirection={["down"]} style={styles.modal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "position" : "height"}>
          <View style={{ backgroundColor: AppColors.darkBlue, padding: 24, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
            <Column spacing={8}>
              <Row>
                <Pressable style={{ paddingBottom: 16 }} onPress={() => setModalVisible(false)}>
                  <AppIcon name={"close-outline"} color={AppColors.white} />
                </Pressable>
              </Row>
              <SeatsForm seats={-seats} setSeats={setSeats} maxSeats={liane.freeSeatsCount} />
            </Column>
            <View style={{ marginVertical: 24 }}>
              <CardTextInput value={message} multiline={true} numberOfLines={5} placeholder={"Ajouter un message..."} onChangeText={setMessage} />
            </View>

            <View style={{ justifyContent: "flex-end", paddingHorizontal: 24 }}>
              <AppRoundedButton
                color={defaultTextColor(AppColors.orange)}
                onPress={requestJoin}
                backgroundColor={AppColors.orange}
                text={"Envoyer la demande"}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppBottomSheetScrollView>
  );
};

const styles = StyleSheet.create({
  section: { paddingVertical: 16, marginHorizontal: 24 },
  modal: {
    justifyContent: "flex-end",
    margin: 0
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppColors.white
  }
});
