import React, { useContext, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import { Center, Column } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { useAppNavigation } from "@/api/navigation";
import { useQueries } from "react-query";
import { AppContext } from "@/components/ContextProvider";
import { UnauthorizedError } from "@/api/exception";
import { TripListView } from "@/screens/user/TripListView";

const MyTripsScreen = () => {
  const { navigation } = useAppNavigation();
  const { services } = useContext(AppContext);
  const queriesData = useQueries([
    { queryKey: JoinRequestsQueryKey, queryFn: () => services.liane.listJoinRequests() },
    { queryKey: LianeQueryKey, queryFn: () => services.liane.list() }
  ]);

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
            <AppButton
              color={AppColors.orange}
              title={"Réessayer"}
              icon={"refresh-outline"}
              onPress={() => {
                if (queriesData[0].error) {
                  queriesData[0].refetch();
                }
                if (queriesData[1].error) {
                  queriesData[1].refetch();
                }
              }}
            />
          </Center>
        </View>
      );
    }
  }

  return (
    <Column spacing={16} style={styles.container}>
      <AppButton
        icon="plus-outline"
        title="Nouvelle Liane"
        onPress={() => {
          // @ts-ignore
          navigation.navigate("Publish");
        }}
      />

      <TripListView
        data={data}
        refreshing={isFetching}
        onRefresh={() => {
          queriesData.forEach(q => q.refetch());
        }}
      />
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    height: "100%"
  }
});

export const LianeQueryKey = "getLianes";
export const JoinRequestsQueryKey = "getJoinRequests";
export default MyTripsScreen;
