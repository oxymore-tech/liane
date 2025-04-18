import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { TripItem } from "@/screens/user/TripItem.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppLocalization } from "@/api/i18n.ts";
import { StaticScreenProps } from "@react-navigation/native";
import { TripQueryKey } from "@/util/hooks/query.ts";
import { TripGeolocationProvider } from "@/screens/detail/TripGeolocationProvider.tsx";

function nowAtNoon() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
}

type Props = StaticScreenProps<{
  trip?: Ref<Trip>;
}>;

const TripScheduleScreen = ({ route }: Props) => {
  const { services, user } = useContext(AppContext);
  const { navigation } = useAppNavigation<"Calendrier">();

  const trip = useQuery(TripQueryKey, async () => await services.community.getIncomingTrips());

  const [currentDate, setCurrentDate] = useState(nowAtNoon());

  useEffect(() => {
    if (!route.params?.trip) {
      return;
    }
    if (!trip.data) {
      return;
    }
    const found = Object.values(trip.data)
      .flatMap(t => t)
      .find(t => t.trip.id === route.params.trip);
    if (!found) {
      return;
    }
    const date = new Date(found.trip.departureTime);
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0));
  }, [route.params?.trip, trip.data]);

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

  const activeTrip = useMemo(() => {
    if (!trip.data) {
      return;
    }
    return Object.values(trip.data)
      .flatMap(t => t)
      .find(t => t.trip.state === "Started")?.trip;
  }, [trip.data]);

  const handleUpdate = useCallback(async () => {
    await trip.refetch();
  }, [trip]);

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
              <AppButton color={AppColors.primaryColor} value="Réessayer" icon="refresh" onPress={handleUpdate} />
            </View>
          </Column>
        </View>
      );
    }
  }

  return (
    <TripGeolocationProvider trip={activeTrip}>
      <Column style={styles.container}>
        <WeekHeader style={{ paddingHorizontal: 8 }} selectedDay={currentDate} onSelect={setCurrentDate} incomingTrips={trip.data} />
        <FlatList
          style={{ flex: 1, backgroundColor: AppColors.lightGrayBackground, paddingHorizontal: 8 }}
          refreshing={trip.isFetching}
          refreshControl={<RefreshControl refreshing={trip.isFetching} onRefresh={handleUpdate} />}
          data={currentList}
          showsVerticalScrollIndicator={false}
          renderItem={props => (
            <TripItem user={user} item={props.item} onOpenTrip={handleOpenTrip} onOpenChat={handleOpenChat} onUpdate={handleUpdate} />
          )}
          keyExtractor={item => item.trip.id!}
          ListEmptyComponent={
            <Center>
              <AppText style={AppStyles.noData}>Aucun trajet {AppLocalization.formatDay(currentDate)}</AppText>
            </Center>
          }
        />
      </Column>
    </TripGeolocationProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    height: "100%",
    flex: 1
  }
});

export default TripScheduleScreen;
