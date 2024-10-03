import React, { useCallback, useContext, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQueries, UseQueryResult } from "react-query";
import { CoLianeMatch, UnauthorizedError } from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";
import { AppText } from "@/components/base/AppText";
import { Center, Column, Row, Space } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/context/ContextProvider";
import { LianeListView } from "@/components/communities/LianeListView";
import { AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { useObservable } from "@/util/hooks/subscription";
import { useFocusEffect } from "@react-navigation/native";

const Header = () => {
  const { navigation } = useAppNavigation();
  const { services } = useContext(AppContext);
  const notificationCount = useObservable<number>(services.notification.unreadNotificationCount, 0);
  const notificationHub = useObservable<string[]>(services.realTimeHub.unreadNotifications, []);

  return (
    <Row style={{ alignItems: "center" }} spacing={16}>
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

  const { services } = useContext(AppContext);
  const queriesData = useQueries([
    {
      queryKey: CoLianeQueryKey,
      queryFn: async () => {
        return await services.community.list();
      }
    }
  ]);

  const isLoading = queriesData.some(q => q.isLoading);
  const error: any = queriesData.find(q => q.error)?.error;
  const isFetching = queriesData.some(q => q.isFetching);

  // Create section list from a list of Liane objects
  const data: CoLianeMatch[] = useMemo(() => {
    return queriesData[0].data ?? [];
  }, [queriesData]);

  useFocusEffect(
    useCallback(() => {
      forceRefetch(queriesData);
    }, [forceRefetch])
  );

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
        {data.length > 0 && <LianeListView data={data} isFetching={isFetching} onRefresh={() => queriesData.forEach(q => q.refetch())} />}
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

const refetch = (queriesData: UseQueryResult[]) => {
  if (queriesData[0].error) {
    queriesData[0].refetch();
  }
};

const forceRefetch = (queriesData: UseQueryResult[]) => {
  queriesData[0].refetch();
};

const styles = StyleSheet.create({
  headerContainer: {
    padding: 16,
    backgroundColor: AppColors.backgroundColor,
    zIndex: 3
  },
  container: {
    marginHorizontal: 16,
    flex: 1
  }
});

export const CoLianeQueryKey = "liane";
export default CommunitiesScreen;
