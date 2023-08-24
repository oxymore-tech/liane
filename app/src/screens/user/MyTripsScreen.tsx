import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { UseQueryResult, useQueries, useQueryClient } from "react-query";

import { Liane, Ref, UnionUtils } from "@/api";
import { UnauthorizedError } from "@/api/exception";
import { useAppNavigation } from "@/api/navigation";
import { Event } from "@/api/notification";

import { AppText } from "@/components/base/AppText";
import { AppTabs } from "@/components/base/AppTabs";
import { Center, Column } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/context/ContextProvider";
import { TripListView } from "@/screens/user/TripListView";

import { AppColors } from "@/theme/colors";

const MyTripsScreen = () => {
  const { navigation } = useAppNavigation();
  const queryClient = useQueryClient();
  const { services } = useContext(AppContext);
  const queriesData = useQueries([
    { queryKey: JoinRequestsQueryKey, queryFn: () => services.liane.listJoinRequests() },
    { queryKey: LianeQueryKey, queryFn: () => services.liane.list(["NotStarted", "Started", "Finished", "Archived"]) }
  ]);
  const [selectedTab, setSelectedTab] = useState(0);
  const isLianeUpcoming = (liane: Liane) => ["NotStarted", "Started"].includes(liane.state);

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

  const isLoading = queriesData[0].isLoading || queriesData[1].isLoading;
  const error: any = queriesData[0].error || queriesData[1].error;
  const isFetching = queriesData[0].isFetching || queriesData[1].isFetching;

  // Create section list from a list of Liane objects
  const data = useMemo(() => {
    if (queriesData[0].data && queriesData[1].data) {
      return [...queriesData[0].data!.data, ...queriesData[1].data!.data];
    }
    return [];
  }, [queriesData]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
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
          <AppText style={{ textAlign: "center" }}>
            Error:
            {error.message}
          </AppText>
          <Center>
            <AppButton color={AppColors.orange} title={"Réessayer"} icon={"refresh-outline"} onPress={() => refetch(queriesData)} />
          </Center>
        </View>
      );
    }
  }

  return (
    <Column spacing={16} style={styles.container}>
      <AppButton icon="plus-outline" title="Publier une liane" onPress={() => navigation.navigate("Publish", {})} />
      <AppTabs
        items={["A venir", "Passés"]}
        onSelect={setSelectedTab}
        selectedIndex={selectedTab}
        isSelectable={() => true}
        selectedColor={AppColors.darkBlue}
        fontSize={18}
      />

      <TripListView
        data={data.filter(liane => (selectedTab === 0 ? isLianeUpcoming(liane as Liane) : !isLianeUpcoming(liane as Liane)))}
        isFetching={isFetching}
        onRefresh={() => queriesData.forEach(q => q.refetch())}
        reverseSort={selectedTab === 1}
      />
    </Column>
  );
};

const refetch = (queriesData: UseQueryResult[]) => {
  if (queriesData[0].error) {
    queriesData[0].refetch();
  }
  if (queriesData[1].error) {
    queriesData[1].refetch();
  }
};

const styles = StyleSheet.create({
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
