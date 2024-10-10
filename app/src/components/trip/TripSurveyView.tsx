import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText.tsx";
import { AppColors } from "@/theme/colors.ts";
import { AppLocalization } from "@/api/i18n.ts";
import { addSeconds, capitalize, CoLiane, DayOfWeekFlag, Liane, LianeMessage, RallyingPoint, TimeOnlyUtils, TripMessage } from "@liane/common";
import React, { useCallback, useContext, useMemo, useState } from "react";
import { Center, Column, Row } from "@/components/base/AppLayout.tsx";
import { UserPicture } from "@/components/UserPicture.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable.tsx";
import { WayPointView } from "@/components/trip/WayPointsView.tsx";
import { useQuery, useQueryClient } from "react-query";
import { LianeDetailQueryKey, LianeQueryKey } from "@/screens/user/MyTripsScreen.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { LianeStatusView } from "@/components/trip/LianeStatusView.tsx";
import { SimpleModal } from "@/components/modal/SimpleModal.tsx";
import { DayOfTheWeekPicker } from "@/components/DayOfTheWeekPicker.tsx";
import { TimeWheelPicker } from "@/components/TimeWheelPicker.tsx";

export const TripSurveyView = ({ message, coLiane, color }: { message: LianeMessage<TripMessage>; coLiane: CoLiane; color: string }) => {
  const { services, user } = useContext(AppContext);

  const trip = useQuery(LianeDetailQueryKey(message.content.value), () => services.liane.get(message.content.value));
  const [tripModalVisible, setTripModalVisible] = useState(false);

  const { isMember } = useMemo(() => {
    if (!trip.data) {
      return { isMember: false };
    }
    const me = trip.data.members.some(m => m.user.id === user!.id);
    return { isMember: me };
  }, [trip.data, user]);

  const queryClient = useQueryClient();

  const handleJoinTrip = useCallback(async () => {
    if (!trip.data) {
      return;
    }
    if (isMember) {
      return;
    }

    await services.community.joinTrip({ liane: coLiane.id!, trip: trip.data.id!, takeReturnTrip: false });
    await queryClient.invalidateQueries(LianeDetailQueryKey(message.content.value));
    await queryClient.invalidateQueries(LianeQueryKey);
  }, [trip.data, isMember, services.community, coLiane.id, queryClient, message.content.value]);

  const editLianeTrip = async (d: Date) => {
    setTripModalVisible(false);

    // in this update function, we just update the start date.
    if (trip.data?.id) {
      await services.liane.updateDepartureTime(trip.data?.id, d.toISOString());
      message.id && (await queryClient.invalidateQueries(LianeDetailQueryKey(message.content.value)));
    }
  };

  return (
    <View>
      {trip.isLoading && <ActivityIndicator color={AppColors.white} />}
      {trip.isError && <AppText>Erreur de chargement</AppText>}
      {!!trip.data && (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText style={{ fontWeight: "bold", fontSize: 18, color, marginTop: 5 }}>
              {capitalize(AppLocalization.formatMonthDay(new Date(trip.data.departureTime)))}
            </AppText>
            {trip.data.createdBy === user!.id && isActive(trip.data) ? (
              <AppPressableIcon name={"edit-outline"} onPress={() => setTripModalVisible(true)} />
            ) : null}
          </View>

          <View>
            {trip.data.wayPoints.map((s, i) => (
              <WayPointView
                key={s.rallyingPoint.id}
                wayPoint={s}
                type={i === 0 ? "pickup" : i === trip.data.wayPoints.length - 1 ? "deposit" : "step"}
                isPast={false}
              />
            ))}
          </View>
          {isActive(trip.data) ? (
            <ActiveView trip={trip.data} isMember={isMember} handleJoinTrip={handleJoinTrip} />
          ) : (
            <LianeStatusView style={{ alignSelf: "flex-end" }} liane={trip.data} />
          )}
        </>
      )}
      {trip.data && isActive(trip.data) && (
        <EditTripModal liane={trip.data} editTrip={editLianeTrip} setTripModalVisible={setTripModalVisible} tripModalVisible={tripModalVisible} />
      )}
    </View>
  );
};

type ActiveViewProps = { trip: Liane; isMember: boolean; handleJoinTrip: () => void };

const ActiveView = ({ trip, isMember, handleJoinTrip }: ActiveViewProps) => {
  return (
    <Row style={{ marginTop: 8, justifyContent: "space-between", alignItems: "center" }}>
      <View style={{ marginLeft: 10, justifyContent: "flex-start", flexDirection: "row" }}>
        {trip.members.map(m => (
          <UserPicture key={m.user.id} url={m.user.pictureUrl} id={m.user.id} size={28} style={{ marginLeft: -10 }} />
        ))}
      </View>
      {isMember && <LianeStatusView liane={trip} />}
      {!isMember && (
        <Row spacing={6} style={{ justifyContent: "flex-end" }}>
          <AppPressableOverlay
            backgroundStyle={{ backgroundColor: AppColors.primaryColor, borderRadius: 8 }}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            onPress={handleJoinTrip}>
            <Row style={{ alignItems: "center" }} spacing={6}>
              <AppIcon name={"thumb-up"} color={AppColors.white} size={28} />
              <AppText style={{ color: AppColors.white, fontWeight: "bold", fontSize: 18 }}>Participer</AppText>
            </Row>
          </AppPressableOverlay>
        </Row>
      )}
    </Row>
  );
};

const DateToWeekdays = (date: Date): DayOfWeekFlag => {
  const dayNumber = (date.getDay() + 6) % 7;
  const result = "0000000".split("");
  result[dayNumber] = "1";

  return result.join("") as DayOfWeekFlag;
};

const EditTripModal = ({
  tripModalVisible,
  setTripModalVisible,
  editTrip,
  liane
}: {
  liane: Liane;
  tripModalVisible: boolean;
  setTripModalVisible: (v: boolean) => void;
  editTrip: (d: Date) => void;
}) => {
  const defaultTimeDate = new Date(liane.departureTime);
  const [selectedTime, setSelectedTime] = useState<Date>(defaultTimeDate);

  const [selectedDay, setSelectedDay] = useState<DayOfWeekFlag>(DateToWeekdays(defaultTimeDate));
  const [from] = useState<RallyingPoint>(liane.wayPoints[0].rallyingPoint);
  const [to] = useState<RallyingPoint>(liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint);

  const launch = () => {
    const todayIndex = (selectedTime.getDay() + 6) % 7;

    let selectedDays = selectedDay
      .split("")
      .map((day, index) => (day === "1" ? index : -1))
      .filter(index => index !== -1);

    let firstDay = (selectedDays[0] - todayIndex + 7) % 7;

    if (firstDay === 0 && selectedTime.valueOf() < new Date().valueOf()) {
      firstDay = 7;
    }
    const departureTime = addSeconds(selectedTime, firstDay * 3600 * 24);

    editTrip(departureTime);
  };

  return (
    <SimpleModal visible={tripModalVisible} setVisible={setTripModalVisible} backgroundColor={AppColors.white} hideClose>
      <Column spacing={8}>
        <Column spacing={8}>
          <View>
            <Row spacing={6}>
              <AppText style={[{ marginTop: 5 }, styles.modalText]}>{from.label}</AppText>
              <AppPressableIcon name={"arrow-forward-outline"} />
              <AppIcon name={"person-outline"} />
              <AppText style={[{ marginTop: 5 }, styles.modalText]}>{to.label}</AppText>
            </Row>
          </View>
          <View>
            <Row spacing={6}>
              <DayOfTheWeekPicker selectedDays={selectedDay} onChangeDays={setSelectedDay} enabledDays={"1111111"} singleOptionMode={true} />
            </Row>
          </View>
          <AppText style={styles.modalText}>Départ à :</AppText>
          <Center>
            <TimeWheelPicker
              date={TimeOnlyUtils.fromDate(defaultTimeDate)}
              minuteStep={5}
              onChange={d =>
                setSelectedTime(new Date(defaultTimeDate.getFullYear(), defaultTimeDate.getMonth(), defaultTimeDate.getDay(), d.hour, d.minute))
              }
            />
          </Center>
          <Row style={{ justifyContent: "flex-end" }}>
            <AppPressableIcon name={"checkmark-outline"} onPress={launch} />
          </Row>
        </Column>
      </Column>
    </SimpleModal>
  );
};

function isActive(liane: Liane): boolean {
  return liane.state === "Started" || liane.state === "NotStarted";
}

const styles = StyleSheet.create({
  modalText: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 24
  }
});
