import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { UseQueryResult, useQueries, useQueryClient } from "react-query";
import { JoinLianeRequestDetailed, Liane, Ref, UnionUtils } from "@/api";
import { UnauthorizedError } from "@/api/exception";
import { useAppNavigation } from "@/api/navigation";
import { Event } from "@/api/notification";
import { AppText } from "@/components/base/AppText";
import { AppTabs } from "@/components/base/AppTabs";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/context/ContextProvider";
import { TripListView } from "@/screens/user/TripListView";
import { AppColors } from "@/theme/colors";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { AppStyles } from "@/theme/styles";
import { useSubscription } from "@/util/hooks/subscription";
import { UserPicture } from "@/components/UserPicture";

const MyTripsScreen = () => {
  const { navigation } = useAppNavigation();
  const queryClient = useQueryClient();
  const { services, user } = useContext(AppContext);
  const queriesData = useQueries([
    { queryKey: JoinRequestsQueryKey, queryFn: () => services.liane.listJoinRequests() },
    { queryKey: LianeQueryKey, queryFn: () => services.liane.list(["NotStarted", "Started"], undefined, 25, false) }
  ]);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    const s = services.realTimeHub.subscribeToNotifications(async n => {
      // TODO make sure "type" is serialized via Hub

      //  @ts-ignore
      if (UnionUtils.isInstanceOf<Event>(n, "Event") || (!n.type && !!n.payload)) {
        await queryClient.invalidateQueries(LianeQueryKey);
        await queryClient.invalidateQueries(JoinRequestsQueryKey);
      }
    });
    return () => s.unsubscribe();
  }, []);

  useSubscription(services.realTimeHub.lianeUpdates, liane => {});

  const isFetchingFutureLianes = queryClient.isFetching({
    predicate: query => query.queryKey === LianeQueryKey || query.queryKey === JoinRequestsQueryKey
  });
  useEffect(() => {
    if (isFetchingFutureLianes) {
      setSelectedTab(0);
    }
  }, [isFetchingFutureLianes]);

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
    <Column style={{ backgroundColor: AppColors.lightGrayBackground }}>
      <Column style={styles.headerContainer} spacing={16}>
        <Row>
          <AppButton
            style={{ flex: 1 }}
            icon="plus-outline"
            kind="rounded"
            title="Créer une liane"
            onPress={() => navigation.navigate("Publish", {})}
          />
          <View style={{ flex: 1, alignItems: "flex-end", justifyContent: "center", marginRight: 12 }}>
            <TouchableOpacity
              style={[AppStyles.center, { borderWidth: 1, borderRadius: 20, borderColor: AppColors.primaryColor }]}
              onPress={() =>
                // @ts-ignore
                navigation.navigate("Profile", { user })
              }>
              <UserPicture size={32} url={user?.pictureUrl} id={user?.id} />
            </TouchableOpacity>
          </View>
        </Row>
        <AppTabs
          items={["Lianes à venir", "Lianes passés"]}
          onSelect={setSelectedTab}
          selectedIndex={selectedTab}
          isSelectable={() => true}
          fontSize={16}
        />
      </Column>
      <Column spacing={16} style={styles.container}>
        {selectedTab === 0 && data.length === 0 && <NoFutureTrip />}
        {selectedTab === 0 && data.length > 0 && (
          <TripListView data={data} isFetching={isFetching} onRefresh={() => queriesData.forEach(q => q.refetch())} reverseSort={false} />
        )}
        {selectedTab === 1 && <PastLianeListView />}
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
  (repository, params, cursor) => repository.liane.list(["Finished", "Archived"], cursor, 10, false),
  LianePastQueryKey,
  NoRecentTrip
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
    backgroundColor: AppColors.backgroundColor,
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 24
  },
  container: {
    marginHorizontal: 16,
    height: "100%"
  }
});

export const LianeQueryKey = "getLianes";
export const LianeDetailQueryKey = (id: Ref<Liane>) => ["liane", id];
export const JoinRequestsQueryKey = "getJoinRequests";
export const JoinRequestDetailQueryKey = (id: Ref<Liane>) => ["join_request", id];
export default MyTripsScreen;
