import React, { useContext } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQuery } from "react-query";
import { Liane, Ref, UnauthorizedError } from "@liane/common";
import { AppText } from "@/components/base/AppText";
import { Center, Column } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/context/ContextProvider";
import { TripListView } from "@/screens/user/TripListView";
import { AppColors } from "@/theme/colors";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { AppStyles } from "@/theme/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FutureStates } from "@/components/context/QueryUpdateProvider";
import { AppModalNavigationContext } from "@/components/AppModalNavigationProvider";

const MyTripsScreen = () => {
  const insets = useSafeAreaInsets();

  const { services } = useContext(AppContext);
  const trip = useQuery(TripQueryKey, async () => {
    return await services.liane.list(FutureStates, { cursor: undefined, limit: 25, asc: false });
  });

  const { shouldShow, showTutorial } = useContext(AppModalNavigationContext);

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TripListView data={list} isFetching={trip.isFetching} onRefresh={() => trip.refetch()} reverseSort={false} />
    </View>
  );
};

const NoRecentTrip = () => {
  return (
    <Center>
      <AppText style={AppStyles.noData}>Vous n'avez pas encore effectué de trajets.</AppText>
    </Center>
  );
};

export const LianePastQueryKey = "getPastTrips";

const PastLianeListView = WithFetchPaginatedResponse<Liane>(
  ({ data, refresh, refreshing, fetchNextPage, isFetchingNextPage }) => {
    return (
      <>
        <TripListView data={data} isFetching={refreshing} onRefresh={refresh} loadMore={fetchNextPage} reverseSort={true} />
        {isFetchingNextPage && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" }}>
            <ActivityIndicator style={AppStyles.center} color={AppColors.primaryColor} size="large" />
          </View>
        )}
      </>
    );
  },
  (repository, params, cursor) => repository.liane.list(["Finished", "Archived"], { cursor, limit: 10, asc: false }),
  LianePastQueryKey,
  NoRecentTrip
);

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: AppColors.lightGrayBackground
  },
  container: {
    backgroundColor: AppColors.lightGrayBackground,
    height: "100%",
    paddingHorizontal: 16,
    flex: 1
  }
});

export const TripQueryKey = "trip";
export const TripDetailQueryKey = (id: Ref<Liane>) => ["trip", id];
export default MyTripsScreen;
