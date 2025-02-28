import { DayOfWeekFlag, RallyingPoint, Ref, ResolvedLianeRequest, TimeOnly } from "@liane/common";
import React, { useCallback, useMemo, useState } from "react";
import { SimpleModal } from "@/components/modal/SimpleModal.tsx";
import { AppColors } from "@/theme/colors.ts";
import { Center, Column, Row } from "@/components/base/AppLayout.tsx";
import { AppText } from "@/components/base/AppText.tsx";
import { StyleSheet, Switch, View } from "react-native";
import { TimeView } from "@/components/TimeView.tsx";
import { DateView } from "@/components/DateView.tsx";
import { ItineraryForm } from "@/components/forms/ItineraryForm.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { SeatsForm } from "@/components/forms/SeatsForm.tsx";

export type LaunchTripProps = {
  lianeRequest: ResolvedLianeRequest;
  tripModalVisible: boolean;
  setTripModalVisible: (v: boolean) => void;
  launchTrip: (arriveBefore: Date, returnAfter: Date | undefined, from: Ref<RallyingPoint>, to: Ref<RallyingPoint>, availableSeats: number) => void;
  launching?: boolean;
};

export const LaunchTripModal = ({ tripModalVisible, setTripModalVisible, launchTrip, lianeRequest, launching = false }: LaunchTripProps) => {
  const [from, setFrom] = useState<RallyingPoint>(lianeRequest.wayPoints[0]);
  const [to, setTo] = useState<RallyingPoint>(lianeRequest.wayPoints[lianeRequest.wayPoints.length - 1]);
  const [roundTrip, setRoundTrip] = useState<boolean>(lianeRequest.roundTrip);
  const [arriveBefore, setArriveBefore] = useState(lianeRequest.arriveBefore);
  const [returnAfter, setReturnAfter] = useState(lianeRequest.returnAfter);
  const plannedDate = useMemo(() => getNextAvailableDay(lianeRequest.weekDays, lianeRequest.arriveBefore), [lianeRequest]);
  const [availableSeats, setAvailableSeats] = useState(-3);

  const [date, setDate] = useState(plannedDate);

  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);

  const launch = useCallback(() => {
    const arriveAt = new Date(date);
    arriveAt.setHours(arriveBefore.hour, arriveBefore.minute ?? 0);
    const returnAt = roundTrip ? new Date(date) : undefined;
    returnAt?.setHours(returnAfter.hour, returnAfter.minute ?? 0);
    launchTrip(arriveAt, returnAt, from.id!, to.id!, availableSeats);
  }, [arriveBefore.hour, arriveBefore.minute, availableSeats, date, from.id, launchTrip, returnAfter.hour, returnAfter.minute, roundTrip, to.id]);

  const handleSetVisible = useCallback(
    (visible: boolean) => {
      if (!visible) {
        setFrom(lianeRequest.wayPoints[0]);
        setTo(lianeRequest.wayPoints[lianeRequest.wayPoints.length - 1]);
        setRoundTrip(lianeRequest.roundTrip);
        setArriveBefore(lianeRequest.arriveBefore);
        setReturnAfter(lianeRequest.returnAfter);
        setDate(plannedDate);
      }
      setTripModalVisible(visible);
    },
    [lianeRequest.arriveBefore, lianeRequest.returnAfter, lianeRequest.roundTrip, lianeRequest.wayPoints, plannedDate, setTripModalVisible]
  );

  const switchDestination = useCallback(() => {
    const ToTemp = to;
    setTo(from);
    setFrom(ToTemp);
  }, [from, to]);

  return (
    <SimpleModal visible={tripModalVisible} setVisible={handleSetVisible} backgroundColor={AppColors.white} hideClose>
      <Column>
        <AppText style={{ fontSize: 22, fontWeight: "bold", lineHeight: 24 }}>Lancer un trajet</AppText>
        <Column spacing={8}>
          <ItineraryForm from={from} to={to} onValuesSwitched={switchDestination} editable={false} style={[styles.itinerary, styles.breathe]} />

          <Center>
            <DateView date={date} onChange={setDate} editable minDate={minDate} maxDate={maxDate} />
          </Center>

          <Row spacing={8} style={{ alignItems: "baseline", justifyContent: "space-between" }}>
            <AppText style={styles.modalText}>Horaire d'arrivée</AppText>
            <TimeView value={arriveBefore} onChange={setArriveBefore} editable />
          </Row>

          <Row spacing={4} style={{ maxWidth: "100%", alignItems: "center", justifyContent: "space-between" }}>
            <AppText style={[styles.modalText, !roundTrip && { textDecorationLine: "line-through" }]} ellipsizeMode="middle">
              Horaire de retour
            </AppText>
            <Switch
              trackColor={{ false: AppColors.grayBackground, true: AppColors.primaryColor }}
              thumbColor={roundTrip ? AppColors.white : AppColors.grayBackground}
              ios_backgroundColor={AppColors.grayBackground}
              value={roundTrip}
              onValueChange={setRoundTrip}
            />
            <View style={{ flex: 1 }} />
            <TimeView
              textStyle={!roundTrip && { textDecorationLine: "line-through" }}
              value={returnAfter}
              onChange={setReturnAfter}
              editable={roundTrip}
            />
          </Row>

          <Row spacing={4} style={{ maxWidth: "100%", alignItems: "center", justifyContent: "space-between" }}>
            <AppText style={styles.modalText}>Places</AppText>
            <SeatsForm seats={availableSeats} setSeats={setAvailableSeats} />
          </Row>
          <AppButton style={styles.breathe} color={AppColors.primaryColor} value="Valider" icon="car" onPress={launch} loading={launching} />
        </Column>
      </Column>
    </SimpleModal>
  );
};

function getNextAvailableDay(weekDays: DayOfWeekFlag, arriveBefore: TimeOnly): Date {
  const now = new Date();
  if (now.getHours() * 60 + now.getMinutes() > arriveBefore.hour * 60 + (arriveBefore.minute ?? 0)) {
    now.setDate(now.getDate() + 1);
  }

  const currentDay_fromMonday = (now.getDay() + 6) % 7;

  const planned = new Date(now);
  planned.setHours(arriveBefore.hour, arriveBefore.minute ?? 0);

  for (let i = currentDay_fromMonday; i < 7 + currentDay_fromMonday; i++) {
    const offset = i - currentDay_fromMonday;
    if (weekDays[i] === "1") {
      planned.setDate(planned.getDate() + offset);
      return planned;
    }
  }

  return planned;
}

const styles = StyleSheet.create({
  breathe: {
    marginTop: 16
  },
  itinerary: {
    backgroundColor: AppColors.white,
    borderWidth: 2,
    borderColor: AppColors.lightGrayBackground,
    borderRadius: 18,
    paddingVertical: 6
  },
  modalText: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 24
  }
});
