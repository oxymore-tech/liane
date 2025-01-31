import { CoLiane, FullUser, IncomingTrip, Ref, Trip } from "@liane/common";
import { StyleSheet, View } from "react-native";
import { Row } from "@/components/base/AppLayout.tsx";
import { WayPointsView } from "@/components/trip/WayPointsView.tsx";
import { AppText } from "@/components/base/AppText.tsx";
import { AppColorPalettes, AppColors } from "@/theme/colors.ts";
import { AppAvatars } from "@/components/UserPicture.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { AppPressable } from "@/components/base/AppPressable.tsx";
import { useCallback } from "react";
import { TripActions } from "@/components/trip/TripActions.tsx";

type TripItemProps = {
  item: IncomingTrip;
  onOpenChat: (liane: Ref<CoLiane>) => void;
  onOpenTrip: (trip: Trip) => void;
  onUpdate: (trip: Trip) => void;
  user?: FullUser;
};

export function TripItem({ item, onOpenChat, onOpenTrip, user, onUpdate }: TripItemProps) {
  const handleOpenChat = useCallback(() => {
    onOpenChat(item.trip.liane);
  }, [item.trip.liane, onOpenChat]);

  const handleOpenTrip = useCallback(() => {
    onOpenTrip(item.trip);
  }, [item.trip, onOpenTrip]);

  return (
    <View style={[styles.container, { backgroundColor: item.booked ? AppColors.white : AppColorPalettes.gray[200] }]}>
      <AppPressable style={styles.header} onPress={handleOpenChat}>
        <AppText style={[styles.name]}>{item.name}</AppText>
        <Row style={{ alignItems: "center" }}>
          <AppAvatars users={item.trip.members.map(m => m.user)} driver={item.trip.driver?.user} />
          <AppIcon style={{ marginLeft: 4 }} name="message" color={AppColorPalettes.gray[800]} size={30} />
        </Row>
      </AppPressable>
      <AppPressable onPress={handleOpenTrip}>
        <WayPointsView wayPoints={item.trip.wayPoints} />
      </AppPressable>
      <TripActions trip={item} user={user} onUpdate={onUpdate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginTop: 8,
    borderRadius: 8
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8
  }
});
