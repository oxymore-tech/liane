import React, { useContext, useState } from "react";
import {
  WithFetchResource,
  WithFetchResourceErrorComponentProps,
  WithFetchResourceParams,
  WithFetchResourceProps
} from "@/components/base/WithFetchResource";
import { AppServices } from "@/api/service";
import { PaginatedResponse } from "@/api";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AppContext } from "@/components/context/ContextProvider";
import { useInfiniteQuery } from "react-query";
import { UnauthorizedError } from "@/api/exception";
import { AppText } from "@/components/base/AppText";
import { Center } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppColors } from "@/theme/colors";

export interface WithFetchPaginatedResponseProps<T> extends WithFetchResourceProps<T[]> {}

/*
export const WithFetchPaginatedResponse =
  <T,>(
    WrappedComponent: React.ComponentType<WithFetchPaginatedResponseProps<T> & WithFetchResourceParams>,
    loadData: (repository: AppServices, params: any) => Promise<PaginatedResponse<T>>,
    queryKey: string | ((params: any) => string),
    EmptyResponseComponent: React.ComponentType,
    ErrorComponent?: React.ComponentType<WithFetchResourceErrorComponentProps>
  ) =>
  (props: any & WithFetchResourceParams) => {
    const { services } = useContext(AppContext);
    const [refreshing, setRefreshing] = useState(false);

    const realQueryKey = typeof queryKey === "string" ? queryKey : queryKey(props.params);
    const { isLoading, error, data, refetch } = useInfiniteQuery<PaginatedResponse<T>, Error>(realQueryKey, () => loadData(services, props.params));
    const dataList: T[] | undefined = data?.pages.map(p => p.data).flat();
    const onRefresh = async () => {
      setRefreshing(true); // isRefetching causes glitters
      await refetch();
      setRefreshing(false);
    };

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

    if (dataList!.length === 0) {
      return (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <EmptyResponseComponent />
        </ScrollView>
      );
    } else {
      console.log(JSON.stringify(data));
      return <WrappedComponent data={dataList} refresh={onRefresh} refreshing={refreshing} {...props} />;
    }
  };

const styles = StyleSheet.create({
  container: {
    height: "100%",
    alignContent: "center",
    justifyContent: "center"
  }
});
*/

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
