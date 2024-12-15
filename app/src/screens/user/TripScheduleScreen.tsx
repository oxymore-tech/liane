import React, { useCallback, useContext, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useQuery } from "react-query";
import { CoLiane, DayOfWeekUtils, Ref, Trip, UnauthorizedError } from "@liane/common";
import { AppText } from "@/components/base/AppText";
import { Center, Column } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/context/ContextProvider";
import { AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { WeekHeader } from "@/screens/user/WeekHeader.tsx";
import { useSubscription } from "@/util/hooks/subscription.ts";
import { TripItem } from "@/screens/user/TripItem.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppLocalization } from "@/api/i18n.ts";

function nowAtNoon() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
}

const TripScheduleScreen = () => {
  const { services } = useContext(AppContext);

  const trip = useQuery(TripQueryKey, async () => await services.community.getIncomingTrips());

  useSubscription<Trip>(
    services.realTimeHub.tripUpdates,
    () => {
      trip.refetch().then();
    },
    []
  );

  const [currentDate, setCurrentDate] = useState(nowAtNoon());

  const { navigation } = useAppNavigation();

  const handleOpenTrip = useCallback(
    (t: Trip) => {
      navigation.navigate({ name: "TripDetail", params: { trip: t } });
    },
    [navigation]
  );

  const handleOpenChat = useCallback(
    (liane: Ref<CoLiane>) => {
      navigation.navigate({ name: "CommunitiesChat", params: { liane } });
    },
    [navigation]
  );

  const currentList = useMemo(() => {
    if (!trip.data) {
      return [];
    }
    return trip.data[DayOfWeekUtils.from(currentDate.getDay())] ?? [];
  }, [trip.data, currentDate]);

  if (trip.error) {
    // Show content depending on the error or propagate it
    if (trip.error instanceof UnauthorizedError) {
      throw trip.error;
    } else {
      return (
        <View style={styles.container}>
          <Column style={[AppStyles.center, AppStyles.fullHeight]}>
            <AppText style={AppStyles.errorData}>Une erreur est survenue.</AppText>
            <AppText style={AppStyles.errorData}>Message: {(trip.error as any).message}</AppText>
            <View style={{ marginTop: 12 }}>
              <AppButton color={AppColors.primaryColor} value="Réessayer" icon="refresh" onPress={() => trip.refetch()} />
            </View>
          </Column>
        </View>
      );
    }
  }

  return (
    <Column style={styles.container}>
      <WeekHeader style={{ paddingHorizontal: 8 }} selectedDay={currentDate} onSelect={setCurrentDate} incomingTrips={trip.data} />
      <FlatList
        style={{ flex: 1, backgroundColor: AppColors.lightGrayBackground, paddingHorizontal: 8 }}
        refreshControl={<RefreshControl refreshing={trip.isFetching} onRefresh={() => trip.refetch()} />}
        data={currentList}
        showsVerticalScrollIndicator={false}
        renderItem={props => <TripItem {...props} onOpenTrip={handleOpenTrip} onOpenChat={handleOpenChat} onUpdate={() => trip.refetch()} />}
        keyExtractor={item => item.trip.id!}
        ListEmptyComponent={
          <Center>
            <AppText style={AppStyles.noData}>Aucun trajet {AppLocalization.formatDay(currentDate)}</AppText>
          </Center>
        }
      />
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    height: "100%",
    flex: 1
  }
});

export const TripQueryKey = "trip";
export const TripDetailQueryKey = (id: Ref<Trip>) => ["trip", id];
export default TripScheduleScreen;
