import React, { useContext, useState } from "react";
import { WithFetchResourceErrorComponentProps, WithFetchResourceParams, WithFetchResourceProps } from "@/components/base/WithFetchResource";
import { AppServices } from "@/api/service";
import { PaginatedResponse, UnauthorizedError } from "@liane/common";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AppContext } from "@/components/context/ContextProvider";
import { useInfiniteQuery } from "react-query";
import { AppText } from "@/components/base/AppText";
import { Center } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppColors } from "@/theme/colors";
import { useAppNavigation } from "@/api/navigation";
import { AppStyles } from "@/theme/styles";

export interface WithFetchPaginatedResponseProps<T> extends WithFetchResourceProps<T[]> {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export const WithFetchPaginatedResponse =
  <T,>(
    WrappedComponent: React.ComponentType<WithFetchPaginatedResponseProps<T> & WithFetchResourceParams>,
    loadData: (repository: AppServices, params: any, cursor: string | undefined) => Promise<PaginatedResponse<T>>,
    queryKey: string | string[] | ((params: any) => string | string[]),
    EmptyResponseComponent: React.ComponentType,
    ErrorComponent?: React.ComponentType<WithFetchResourceErrorComponentProps>
  ) =>
  (props: any & WithFetchResourceParams) => {
    const { services } = useContext(AppContext);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchingNextPage, setFetchingNextPage] = useState(false);
    const { route } = useAppNavigation();

    const params = props.params || route.params;
    const realQueryKey = typeof queryKey === "function" ? queryKey(params) : queryKey;
    const { isLoading, error, data, refetch, fetchNextPage, hasNextPage } = useInfiniteQuery<PaginatedResponse<T>, Error>(
      realQueryKey,
      ({ pageParam = undefined }) => loadData(services, params, pageParam),
      { getNextPageParam: lastPage => (lastPage.next ? lastPage.next : undefined) }
    );

    const onRefresh = async () => {
      setRefreshing(true); // isRefetching causes glitters
      await refetch();
      setRefreshing(false);
    };

    const onFetchNextPage = async () => {
      setFetchingNextPage(true);
      await fetchNextPage();
      setFetchingNextPage(false);
    };

    if (isLoading || !data?.pages) {
      return <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />;
    }
    if (error) {
      // Show content depending on the error or propagate it
      if (error instanceof UnauthorizedError) {
        throw error;
      } else {
        return ErrorComponent ? (
          <ErrorComponent error={error} />
        ) : (
          <View style={styles.container}>
            <AppText style={{ textAlign: "center" }}>
              Error:
              {error.message}
            </AppText>
            <Center>
              <AppButton color={AppColors.primaryColor} title={"Réessayer"} icon={"refresh-outline"} onPress={onRefresh} />
            </Center>
          </View>
        );
      }
    }

    const dataList = data.pages.map(p => p.data).flat();
    if (dataList!.length === 0) {
      return (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <EmptyResponseComponent />
        </ScrollView>
      );
    }
    return (
      <WrappedComponent
        {...props}
        data={dataList}
        refresh={onRefresh}
        refreshing={refreshing}
        fetchNextPage={onFetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={fetchingNextPage}
      />
    );
  };

const styles = StyleSheet.create({
  container: {
    height: "100%",
    alignContent: "center",
    justifyContent: "center"
  }
});
