import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQuery } from "react-query";
import React, { useContext, useState } from "react";
import { AppText } from "@/components/base/AppText";
import { AppContext } from "@/components/context/ContextProvider";
import { UnauthorizedError } from "@liane/common";
import { AppServices } from "@/api/service";
import { AppColors } from "@/theme/colors";
import { AppButton } from "@/components/base/AppButton";
import { Center } from "@/components/base/AppLayout";
import { useAppNavigation } from "@/components/context/routing";
import { AppStyles } from "@/theme/styles";

export interface WithFetchResourceProps<T> {
  data: T;
  refresh: () => void;
  refreshing: boolean;
}

export interface WithFetchResourceErrorComponentProps {
  error?: any;
}

export interface WithFetchResourceParams {
  params?: any;
}
/**
 * Higher order component that shows a spinner while fetching data asynchronously and displays an error when necessary.
 * @param WrappedComponent the component receiving the data. Props should extend WithFetchResourceProps.
 * @param loadData the callback to fetch the data.
 * @param queryKey a key used for caching
 * @param ErrorComponent a component to display if an error is shown
 */

export const WithFetchResource =
  <T,>(
    WrappedComponent: React.ComponentType<WithFetchResourceProps<T> & WithFetchResourceParams>,
    loadData: (repository: AppServices, params: any) => Promise<T>,
    queryKey: string | string[] | ((params: any) => string | string[]),
    ErrorComponent?: React.ComponentType<WithFetchResourceErrorComponentProps>
  ) =>
  (props: any & WithFetchResourceParams) => {
    const { services } = useContext(AppContext);
    const [refreshing, setRefreshing] = useState(false);
    const { route } = useAppNavigation();

    const params = props.params || route.params;
    const realQueryKey = typeof queryKey === "function" ? queryKey(params) : queryKey;
    const { isLoading, error, data, refetch } = useQuery<T, Error>(realQueryKey, () => loadData(services, params));

    const onRefresh = async () => {
      setRefreshing(true); // isRefetching causes glitters
      await refetch();
      setRefreshing(false);
    };

    if (isLoading) {
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
              <AppButton color={AppColors.primaryColor} value="Réessayer" icon="refresh" onPress={onRefresh} />
            </Center>
          </View>
        );
      }
    }
    return <WrappedComponent {...props} data={data} refresh={onRefresh} refreshing={refreshing} />;
  };

const styles = StyleSheet.create({
  container: {
    height: "100%",
    alignContent: "center",
    justifyContent: "center"
  }
});
