import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQueries, useQueryClient, UseQueryResult } from "react-query";
import { JoinLianeRequestDetailed, Liane, Ref, UnauthorizedError } from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";
import { AppText } from "@/components/base/AppText";
import { AppTabs } from "@/components/base/AppTabs";
import { Center, Column, Row, Space } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/context/ContextProvider";
import { LianeListView } from "@/components/communities/LianeListView";
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
import { TripListView } from "@/screens/user/TripListView";

const Header = () => {
  const { navigation } = useAppNavigation();
  const { services } = useContext(AppContext);
  const notificationCount = useObservable<number>(services.notification.unreadNotificationCount, 0);
  const notificationHub = useObservable<string[]>(services.realTimeHub.unreadNotifications, []);

  return (
    <Row style={{ alignItems: "center" }} spacing={16}>
      {/*<AppButton style={{ flex: 1 }} icon="plus-outline" kind="rounded" title="Créer une liane" onPress={() => navigation.navigate("Publish", {})} />*/}
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

export const CommunitiesScreen = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { services } = useContext(AppContext);
  const queriesData = useQueries([
    { queryKey: JoinRequestsQueryKey, queryFn: () => services.liane.listJoinRequests() },
    {
      queryKey: LianeQueryKey,
      queryFn: async () => {
        const lianes = await services.liane.list(FutureStates, { cursor: undefined, limit: 25, asc: false });
        await services.reminder.syncReminders(lianes.data);
        return lianes;
      }
    }
  ]);

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

  const isLoading = queriesData.some(q => q.isLoading);
  const error: any = queriesData.find(q => q.error)?.error;
  const isFetching = queriesData.some(q => q.isFetching);

  // Create section list from a list of Liane objects
  const data: (JoinLianeRequestDetailed | Liane)[] = useMemo(() => {
    if (queriesData[0].data && queriesData[1].data) {
      return [...queriesData[0].data!.data, ...queriesData[1].data!.data];
    }
    return [];
  }, [queriesData]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />
      </View>
    );
  }

  if (error) {
    // Show content depending on the error or propagate it
    if (error instanceof UnauthorizedError) {
      throw error;
    } else {
      return (
        <View style={styles.container}>
          <Column style={[AppStyles.center, AppStyles.fullHeight]}>
            <AppText style={AppStyles.errorData}>Une erreur est survenue.</AppText>
            <AppText style={AppStyles.errorData}>Message: {error.message}</AppText>
            <View style={{ marginTop: 12 }}>
              <AppButton color={AppColors.primaryColor} title={"Réessayer"} icon={"refresh-outline"} onPress={() => refetch(queriesData)} />
            </View>
          </Column>
        </View>
      );
    }
  }

  return (
    <Column style={{ backgroundColor: AppColors.lightGrayBackground, height: "100%" }}>
      <Column style={[styles.headerContainer, { paddingTop: insets.top }]} spacing={16}>
        <Header />
      </Column>
      <Column spacing={16} style={styles.container}>
        {data.length === 0 && <NoLiane />}
        {data.length > 0 && (
          <LianeListView data={data} isFetching={isFetching} onRefresh={() => queriesData.forEach(q => q.refetch())} reverseSort={false} />
        )}
      </Column>
    </Column>
  );
};

const NoLiane = () => {
  return (
    <Center>
      <AppText style={AppStyles.noData}>Vous n'avez aucune liane pour le moment.</AppText>
    </Center>
  );
};

export const LianePastQueryKey = "getPastTrips";

const PastLianeListView = WithFetchPaginatedResponse<Liane>(
  ({ data, refresh, refreshing, fetchNextPage, isFetchingNextPage }) => {
    return (
      <>
        <LianeListView data={data} isFetching={refreshing} onRefresh={refresh} loadMore={fetchNextPage} reverseSort={true} />
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
  NoLiane
);

const refetch = (queriesData: UseQueryResult[]) => {
  if (queriesData[0].error) {
    queriesData[0].refetch();
  }
  if (queriesData[1].error) {
    queriesData[1].refetch();
  }
};

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

export const LianeQueryKey = "getLianes";
export const LianeDetailQueryKey = (id: Ref<Liane>) => ["liane", id];
export const JoinRequestsQueryKey = "getJoinRequests";
export const JoinRequestDetailQueryKey = (id: Ref<Liane>) => ["join_request", id];
export default CommunitiesScreen;
