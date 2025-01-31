import { FullUser, IncomingTrip, Trip } from "@liane/common";
import { useTripStatus } from "@/components/trip/trip";
import React, { useCallback, useContext, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AppColors } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { AppText } from "@/components/base/AppText.tsx";

type TripActionsProps = {
  trip: IncomingTrip;
  style?: StyleProp<ViewStyle>;
  user?: FullUser;
  onUpdate: (trip: Trip) => void;
};

export function TripActions({ style, trip, onUpdate, user }: TripActionsProps) {
  const status = useTripStatus(trip.trip);
  console.log("status", status);
  const { services } = useContext(AppContext);

  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [stoping, setStoping] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      await services.trip.start(trip.trip.id!);
      onUpdate(trip.trip);
    } finally {
      setStarting(false);
    }
  }, [onUpdate, services.trip, trip.trip]);

  const handleStop = useCallback(async () => {
    setStoping(true);
    try {
      await services.trip.updateFeedback(trip.trip.id!, { comment: "Terminé", canceled: false });
      onUpdate(trip.trip);
    } finally {
      setStoping(false);
    }
  }, [onUpdate, services.trip, trip.trip]);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    try {
      await services.community.joinTrip({ liane: trip.trip.liane, trip: trip.trip.id!, takeReturnTrip: false });
      onUpdate(trip.trip);
    } finally {
      setJoining(false);
    }
  }, [onUpdate, services.community, trip.trip]);

  const handleLeave = useCallback(async () => {
    setLeaving(true);
    try {
      await services.trip.leave(trip.trip.id!);
      onUpdate(trip.trip);
    } finally {
      setLeaving(false);
    }
  }, [onUpdate, services.trip, trip.trip]);

  if (status === "Finished") {
    return;
  }

  const availableSeats = trip.trip.members.reduce((acc, m) => acc + m.seatCount, 0);

  return (
    <Row style={[styles.container, style]}>
      {status === "Started" && <AppIcon style={{ marginLeft: 5 }} name="car" color={AppColors.primaryColor} size={30} />}
      {trip.booked && status === "NotStarted" ? (
        <AppButton value="Quitter" loading={leaving} onPress={handleLeave} color={AppColors.backgroundColor} />
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {trip.booked ? (
        status === "Started" ? (
          <AppButton value="C'est terminé ?" loading={stoping} onPress={handleStop} color={AppColors.secondaryColor} />
        ) : (
          <AppButton value="C'est parti ?" loading={starting} onPress={handleStart} color={AppColors.primaryColor} />
        )
      ) : availableSeats < 0 ? (
        <AppButton value="Rejoindre" loading={joining} onPress={handleJoin} color={AppColors.primaryColor} />
      ) : (
        <AppText>Plus de place</AppText>
      )}
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "space-between"
  }
});
