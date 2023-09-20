import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { Center } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { TripListView } from "@/screens/user/TripListView";
import { Liane } from "@/api";
import { HomeScreenHeader } from "@/components/context/Navigation";
import { AppStyles } from "@/theme/styles";
import { AppColors } from "@/theme/colors";
import { FloatingBackButton } from "@/components/FloatingBackButton";
import { useAppNavigation } from "@/api/navigation";

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
export const LianeHistoryQueryKey = "getLianeHistory";

const ArchivedTripsView = WithFetchPaginatedResponse<Liane>(
  ({ data, refresh, refreshing, fetchNextPage, isFetchingNextPage }) => {
    const { navigation } = useAppNavigation();
    return (
      <>
        <TripListView data={data} isFetching={refreshing} onRefresh={refresh} loadMore={fetchNextPage} reverseSort={true} />
        {isFetchingNextPage && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" }}>
            <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />
          </View>
        )}
        <FloatingBackButton onPress={navigation.goBack} />
      </>
    );
  },
  (repository, params, cursor) => repository.liane.list(["Archived", "Canceled"], cursor, 15, false),
  LianeHistoryQueryKey,
  NoHistoryView
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 100,
    paddingHorizontal: 16,
    height: "100%",
    flex: 1
  }
});
