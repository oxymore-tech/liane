import { FullUser, Trip } from "@liane/common";
import { useTripStatus } from "@/components/trip/trip";
import React, { memo, useCallback, useContext, useMemo, useState } from "react";
import { Alert, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AppColors } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { AppText } from "@/components/base/AppText.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import Geolocation from "../../../native-modules/geolocation";

type TripActionsProps = {
  trip: Trip;
  booked: boolean;
  style?: StyleProp<ViewStyle>;
  user?: FullUser;
  onUpdate: (trip: Trip) => void;
};

export const TripActions = memo(({ style, trip, booked, onUpdate, user }: TripActionsProps) => {
  const status = useTripStatus(trip, user);
  const { services } = useContext(AppContext);
  const { navigation } = useAppNavigation();

  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [stoping, setStoping] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      await services.trip.start(trip.id!);
      onUpdate(trip);
      navigation.navigate("TripGeolocationWizard", { showIntro: true, trip: trip });
    } finally {
      setStarting(false);
    }
  }, [navigation, onUpdate, services.trip, trip]);

  const handleStop = useCallback(async () => {
    setStoping(true);
    try {
      await services.trip.updateFeedback(trip.id!, { comment: "Terminé", canceled: false });
      await Geolocation.stopSendingPings();
      onUpdate(trip);
    } finally {
      setStoping(false);
    }
  }, [onUpdate, services.trip, trip]);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    try {
      await services.community.joinTrip({ liane: trip.liane, trip: trip.id!, takeReturnTrip: false });
      onUpdate(trip);
    } finally {
      setJoining(false);
    }
  }, [onUpdate, services.community, trip]);

  const handleLeave = useCallback(async () => {
    const isDriver = user?.id === trip.driver.user;
    if (!isDriver) {
      setLeaving(true);
      try {
        await services.trip.leave(trip.id!);
        onUpdate(trip);
      } finally {
        setLeaving(false);
      }
      return;
    }
    Alert.alert("Supprimer le trajet", "Voulez-vous vraiment supprimer ce trajet ?", [
      {
        text: "Annuler",
        onPress: () => {},
        style: "cancel"
      },
      {
        text: "Supprimer",
        onPress: async () => {
          setLeaving(true);
          try {
            await services.trip.leave(trip.id!);
            onUpdate(trip);
          } finally {
            setLeaving(false);
          }
        },
        style: "default"
      }
    ]);
  }, [onUpdate, services.trip, trip, user]);

  const availableSeats = useMemo(() => trip.members.reduce((acc, m) => acc + m.seatCount, 0), [trip]);

  if (status === "Finished" || status === "Canceled") {
    return;
  }

  return (
    <Row style={[styles.container, style]}>
      {trip.state === "Started" && <AppIcon style={{ marginLeft: 5 }} name="car" color={AppColors.primaryColor} size={30} />}
      {booked && trip.state === "NotStarted" ? (
        <AppButton value="Annuler" loading={leaving} onPress={handleLeave} color={AppColors.backgroundColor} />
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {booked ? (
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
});

const styles = StyleSheet.create({
  container: {
    justifyContent: "space-between"
  }
});
