import React, { useCallback } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { Center } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { Trip } from "@liane/common";
import { AppStyles } from "@/theme/styles";
import { AppColors } from "@/theme/colors";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppPressable } from "@/components/base/AppPressable.tsx";

export const ArchivedTripsScreen = () => {
  return (
    <View style={styles.container}>
      <ArchivedTripsView />
    </View>
  );
};

const NoHistoryView = () => {
  return (
    <Center>
      <AppText style={AppStyles.noData}>Vous n'avez pas encore effectué de trajets</AppText>
    </Center>
  );
};
export const TripHistoryQueryKey = "getLianeHistory";

const ArchivedTripsView = WithFetchPaginatedResponse<Trip>(
  ({ data, refresh, refreshing, fetchNextPage, isFetchingNextPage }) => {
    return (
      <>
        <ArchivedTripListView data={data} isFetching={refreshing} onRefresh={refresh} loadMore={fetchNextPage} />
        {isFetchingNextPage && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" }}>
            <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />
          </View>
        )}
      </>
    );
  },
  (repository, params, cursor) => repository.trip.list(["Archived", "Canceled"], { cursor, limit: 10, asc: false }),
  TripHistoryQueryKey,
  NoHistoryView
);

export interface ArchivedTripListViewProps {
  data: Trip[];
  style?: StyleProp<ViewStyle>;
  isFetching?: boolean;
  onRefresh?: () => void;
  loadMore?: () => void;
}

export const ArchivedTripListView = ({ data, style, isFetching = false, onRefresh, loadMore }: ArchivedTripListViewProps) => {
  const { navigation } = useAppNavigation();

  const onSelect = useCallback(
    (trip: Trip) => {
      navigation.navigate({ name: "TripDetail", params: { trip } });
    },
    [navigation]
  );

  return (
    <FlatList
      style={style}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} />}
      data={data}
      showsVerticalScrollIndicator={false}
      renderItem={props => <ArchivedTripItem {...props} onSelect={onSelect} />}
      keyExtractor={item => item.id!}
      onEndReachedThreshold={0.2}
      onEndReached={loadMore}
      ListEmptyComponent={
        <Center>
          <AppText style={AppStyles.noData}>Aucun trajet prévu</AppText>
        </Center>
      }
    />
  );
};

type ArchivedTripItemProps = {
  item: Trip;
  onSelect: (trip: Trip) => void;
};

function ArchivedTripItem({ item, onSelect }: ArchivedTripItemProps) {
  return (
    <AppPressable onPress={() => onSelect(item)} style={{ backgroundColor: AppColors.white }}>
      <AppText>{item.id}</AppText>
      <AppText>{item.departureTime}</AppText>
      <AppText>TODO...</AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    height: "100%",
    flex: 1
  }
});
