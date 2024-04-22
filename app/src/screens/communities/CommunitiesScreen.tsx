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

export const CommunitiesScreen = () => {
  const insets = useSafeAreaInsets();

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
            <View
              style={{ backgroundColor: AppColors.primaryColor, borderRadius: 8, height: 12, width: 12, position: "absolute", right: 3, top: 0 }}
            />
          )}
        </View>
      </Row>
    );
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

  return (
    <Column style={{ backgroundColor: AppColors.lightGrayBackground, height: "100%" }}>
      <Column style={[styles.headerContainer, { paddingTop: insets.top }]} spacing={16}>
        <Header />
      </Column>
      <Column spacing={16} style={styles.container}>
        <Center style={{ flex: 1 }}>
          <AppText style={{ fontSize: 18 }}>Bientôt disponible...</AppText>
        </Center>
      </Column>
    </Column>
  );
};
