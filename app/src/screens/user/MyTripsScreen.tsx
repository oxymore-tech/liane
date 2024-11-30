import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "react-query";
import { Liane, Ref, UnauthorizedError } from "@liane/common";
import { AppText } from "@/components/base/AppText";
import { Column } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/context/ContextProvider";
import { TripListView } from "@/screens/user/TripListView";
import { AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FutureStates } from "@/components/context/QueryUpdateProvider";
import { AppModalNavigationContext } from "@/components/AppModalNavigationProvider";
import { WeekHeader } from "@/screens/user/WeekHeader.tsx";

const MyTripsScreen = () => {
  const insets = useSafeAreaInsets();

  const { services } = useContext(AppContext);
  const trip = useQuery(TripQueryKey, async () => {
    return await services.liane.list(FutureStates, { cursor: undefined, limit: 25, asc: false });
  });

  const { shouldShow, showTutorial } = useContext(AppModalNavigationContext);

  const [currentDate, setCurrentDate] = useState(new Date());

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
              <AppButton color={AppColors.primaryColor} value="Réessayer" icon="refresh-outline" onPress={() => trip.refetch()} />
            </View>
          </Column>
        </View>
      );
    }
  }

  const list = trip.data?.data ?? [];

  return (
    <Column style={[styles.container, { paddingTop: insets.top }]}>
      <WeekHeader style={{ paddingHorizontal: 16 }} selectedDay={currentDate} onSelect={setCurrentDate} />
      <TripListView
        style={{ flex: 1, backgroundColor: AppColors.lightGrayBackground, paddingHorizontal: 16 }}
        data={list}
        isFetching={trip.isFetching}
        onRefresh={() => trip.refetch()}
        reverseSort={false}
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
export const TripDetailQueryKey = (id: Ref<Liane>) => ["trip", id];
export default MyTripsScreen;
