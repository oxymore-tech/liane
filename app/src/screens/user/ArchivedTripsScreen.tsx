import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { Center } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { TripListView } from "@/screens/user/TripListView";
import { Liane } from "@/api";
import { HomeScreenHeader } from "@/components/context/Navigation";

export const ArchivedTripsScreen = () => {
  return (
    <View style={styles.container}>
      <HomeScreenHeader label={"Historique des trajets"} />
      <View
        style={{
          marginHorizontal: 24,
          flex: 1
        }}>
        <ArchivedTripsView />
      </View>
    </View>
  );
};

const NoHistoryView = () => {
  return (
    <Center>
      <AppText>Vous n'avez pas encore effectué de trajets</AppText>
    </Center>
  );
};
export const LianeHistoryQueryKey = "getLianeHistory";

const ArchivedTripsView = WithFetchPaginatedResponse<Liane>(
  ({ data, refresh, refreshing, fetchNextPage, isFetchingNextPage }) => {
    return (
      <>
        <TripListView data={data} isFetching={refreshing} onRefresh={refresh} loadMore={fetchNextPage} reverseSort={true} />
        {isFetchingNextPage && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        )}
      </>
    );
  },
  (repository, params, cursor) => repository.liane.list(["Archived", "Canceled"], cursor, 15, false),
  LianeHistoryQueryKey,
  NoHistoryView
);

const styles = StyleSheet.create({
  container: {
    height: "100%",
    flex: 1
  }
});
