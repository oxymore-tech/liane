import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQuery, useQueryClient } from "react-query";
import { Liane, Ref, UnauthorizedError } from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";
import { AppText } from "@/components/base/AppText";
import { AppTabs } from "@/components/base/AppTabs";
import { Center, Column, Row, Space } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/context/ContextProvider";
import { TripListView } from "@/screens/user/TripListView";
import { AppColors } from "@/theme/colors";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { AppStyles } from "@/theme/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { FutureStates } from "@/components/context/QueryUpdateProvider";
import { useIsFocused } from "@react-navigation/native";
import { AppModalNavigationContext } from "@/components/AppModalNavigationProvider";
import { useObservable } from "@/util/hooks/subscription";
import { LianeGeolocation } from "@/api/service/location";

const Header = () => {
  const { navigation } = useAppNavigation();
  const { services } = useContext(AppContext);
  const notificationCount = useObservable<number>(services.notification.unreadNotificationCount, 0);
  const notificationHub = useObservable<string[]>(services.realTimeHub.unreadNotifications, []);

  return (
    <Row style={{ alignItems: "center" }} spacing={16}>
      {/*<AppButton style={{ flex: 1 }} icon="plus-outline" kind="rounded" title="Créer une annonce" onPress={() => navigation.navigate("Publish", {})} />*/}
      <Space />
      <View>
        <AppPressableIcon
          name={"bell-outline"}
          color={AppColors.primaryColor}
          size={32}
          onPress={() => {
            navigation.navigate("Notifications");
          }}
        />
        {Math.max(notificationCount, notificationHub.length) > 0 && (
          <View style={{ backgroundColor: AppColors.primaryColor, borderRadius: 8, height: 12, width: 12, position: "absolute", right: 3, top: 0 }} />
        )}
      </View>
    </Row>
  );
};
const MyTripsScreen = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { services } = useContext(AppContext);
  const trip = useQuery(LianeQueryKey, async () => {
    const lianes = await services.liane.list(FutureStates, { cursor: undefined, limit: 25, asc: false });
    await services.reminder.syncReminders(lianes.data);
    return lianes;
  });
  const [selectedTab, setSelectedTab] = useState(0);

  const isFetchingFutureLianes = queryClient.isFetching({
    predicate: query => query.queryKey === LianeQueryKey
  });
  useEffect(() => {
    if (isFetchingFutureLianes) {
      setSelectedTab(0);
    }
  }, [isFetchingFutureLianes]);
  const { shouldShow, showTutorial } = useContext(AppModalNavigationContext);
  const focused = useIsFocused();

  useEffect(() => {
    if (shouldShow === "passenger" && focused) {
      showTutorial("passenger");
    }
    // do not add function 'showTutorial' to dependencies
  }, [focused, shouldShow]);

  // Cancel pings if necessary
  useEffect(() => {
    LianeGeolocation.currentLiane().then(async current => {
      if (!current) {
        return;
      }
      const liane = await services.liane.get(current);
      if (liane.state !== "Started") {
        await LianeGeolocation.stopSendingPings();
      }
    });
  }, [services.liane]);

  if (trip.isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />
      </View>
    );
  }

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
              <AppButton color={AppColors.primaryColor} title={"Réessayer"} icon={"refresh-outline"} onPress={() => trip.refetch()} />
            </View>
          </Column>
        </View>
      );
    }
  }

  const list = trip.data?.data ?? [];

  return (
    <Column style={{ backgroundColor: AppColors.lightGrayBackground, height: "100%" }}>
      <Column style={[styles.headerContainer, { paddingTop: insets.top }]} spacing={16}>
        <Header />
      </Column>
      <Column spacing={16} style={styles.container}>
        {list.length === 0 && <NoFutureTrip />}
        {list.length > 0 && <TripListView data={list} isFetching={trip.isFetching} onRefresh={() => trip.refetch()} reverseSort={false} />}
      </Column>
    </Column>
  );
};

const NoFutureTrip = () => {
  return (
    <Center>
      <AppText style={AppStyles.noData}>Vous n'avez aucun trajet à venir.</AppText>
    </Center>
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
    padding: 12,
    backgroundColor: AppColors.backgroundColor
  },
  container: {
    marginHorizontal: 16,
    flex: 1
  }
});

export const LianeQueryKey = "trip";
export const LianeDetailQueryKey = (id: Ref<Liane>) => ["trip", id];
export default MyTripsScreen;
