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
import { StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { formatDuration } from "@/util/datetime";
import { CardTextInput } from "@/components/base/CardTextInput";
import { SeatsForm } from "@/components/forms/SeatsForm";
import { JoinRequestsQueryKey } from "@/screens/user/MyTripsScreen";
import { AppContext } from "@/components/ContextProvider";
import { useQueryClient } from "react-query";
import { DriverInfo, InfoItem } from "@/screens/detail/Components";
import { JoinRequest } from "@/api/event";
import { SlideUpModal } from "@/components/modal/SlideUpModal";
import { useAppNavigation } from "@/api/navigation";
import { AppText } from "@/components/base/AppText";

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
  const formattedSeatCount = formatSeatCount(liane.freeSeatsCount);

  // const passengers = liane.liane.members.filter(m => m.user !== liane.liane.driver.user);
  const currentTrip = tripMatch.wayPoints.slice(tripMatch.departureIndex, tripMatch.arrivalIndex + 1);
  const tripDuration = formatDuration(getTotalDuration(currentTrip.slice(1)));
  const tripDistance = Math.ceil(getTotalDistance(currentTrip.slice(1)) / 1000) + " km";

  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [seats, setSeats] = useState(liane.freeSeatsCount > 0 ? -1 : 1);

  const driver = liane.liane.members.find(m => m.user.id === liane.liane.driver.user)!.user;

  const userIsMember = liane.liane.members.findIndex(m => m.user.id === user!.id) >= 0;
  const requestJoin = async () => {
    const unresolvedRequest: JoinRequest = {
      type: "JoinRequest",
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
    setModalVisible(false);
    //@ts-ignore
    navigation.navigate("Home", { screen: "Mes trajets" });
  };

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

      {liane.liane.driver.canDrive && <DriverInfo user={driver} />}
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

        {!userIsMember && (
          <AppRoundedButton
            backgroundColor={AppColors.orange}
            text={"Rejoindre"}
            onPress={() => {
              setModalVisible(true);
            }}
          />
        )}
      </Row>
      {userIsMember && <AppText style={{ marginHorizontal: 24 }}>Vous êtes membre de cette liane.</AppText>}
      <SlideUpModal actionText={"Envoyer la demande"} onAction={requestJoin} visible={modalVisible} setVisible={setModalVisible}>
        <Column>
          <SeatsForm seats={seats} setSeats={setSeats} maxSeats={liane.freeSeatsCount} />
          <View style={{ marginVertical: 24 }}>
            <CardTextInput value={message} multiline={true} numberOfLines={5} placeholder={"Ajouter un message..."} onChangeText={setMessage} />
          </View>
        </Column>
      </SlideUpModal>
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
