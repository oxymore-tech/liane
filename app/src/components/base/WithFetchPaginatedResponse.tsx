import React, { useContext, useState } from "react";
import { WithFetchResourceErrorComponentProps, WithFetchResourceParams, WithFetchResourceProps } from "@/components/base/WithFetchResource";
import { AppServices } from "@/api/service";
import { PaginatedResponse } from "@/api";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppContext } from "@/components/context/ContextProvider";
import { useInfiniteQuery } from "react-query";
import { UnauthorizedError } from "@/api/exception";
import { AppText } from "@/components/base/AppText";
import { Center } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppColors } from "@/theme/colors";
import { useAppNavigation } from "@/api/navigation";

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
        return ErrorComponent ? (
          <ErrorComponent error={error} />
        ) : (
          <View style={styles.container}>
            <AppText style={{ textAlign: "center" }}>
              Error:
              {error.message}
            </AppText>
            <Center>
              <AppButton color={AppColors.orange} title={"Réessayer"} icon={"refresh-outline"} onPress={onRefresh} />
            </Center>
          </View>
        );
      }
    }

    return (
      <WrappedComponent
        {...props}
        data={data.pages.map(p => p.data).flat()}
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
/*
export const WithFetchPaginatedResponse = <T,>(
  WrappedComponent: React.ComponentType<WithFetchPaginatedResponseProps<T> & WithFetchResourceParams>,
  loadData: (repository: AppServices, params: any) => Promise<PaginatedResponse<T>>,
  queryKey: string | ((params: any) => string),
  EmptyResponseComponent: React.ComponentType,
  ErrorComponent?: React.ComponentType<WithFetchResourceErrorComponentProps>
) =>
  WithFetchResource(
    ({ data, refresh, refreshing, ...props }) => {
      const dataList = data.data;

      if (dataList.length === 0) {
        return (
          <ScrollView
            scrollEnabled={false}
            contentContainerStyle={{ flex: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
            <EmptyResponseComponent />
          </ScrollView>
        );
      } else {
        return <WrappedComponent data={dataList} refresh={refresh} refreshing={refreshing} {...props} />;
      }
    },
    loadData,
    queryKey,
    ErrorComponent
  );
*/
