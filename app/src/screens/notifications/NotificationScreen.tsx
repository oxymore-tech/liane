import React, { useContext, useEffect } from "react";
import { AppColors } from "@/theme/colors";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { AppText } from "@/components/base/AppText";
import { Center } from "@/components/base/AppLayout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppNavigation } from "@/components/context/routing";
import { AppContext } from "@/components/context/ContextProvider";
import { NotificationItem } from "@/screens/notifications/NotificationItem";
import { AppStyles } from "@/theme/styles";
import { useQueryUpdater } from "@/components/context/QueryUpdateProvider";
import { AppLogger } from "@/api/logger";
import { Notification } from "@liane/common";

export const NotificationQueryKey = "notification";

const NoNotificationView = () => {
  return (
    <Center>
      <AppText style={AppStyles.noData}>Vous êtes à jour !</AppText>
    </Center>
  );
};

const NotificationScreen = WithFetchPaginatedResponse<Notification>(
  ({ data, refresh, refreshing, fetchNextPage, isFetchingNextPage }) => {
    const insets = useSafeAreaInsets();
    const { navigation } = useAppNavigation();
    const { services, user } = useContext(AppContext);

    const queryUpdater = useQueryUpdater();
    services.realTimeHub.subscribeToNotifications(async (_: Notification) => {
      refresh();
    });
    useEffect(() => {
      const unsubscribe = navigation.addListener("beforeRemove", () => {
        if (data.length === 0) {
          return;
        }
        services.realTimeHub
          .readNotifications()
          .then(() => {
            // Update local seen state
            queryUpdater.readNotifications(user!.id!);
          })
          .catch(e => AppLogger.error("NOTIFICATIONS", "Cannot read notifications", e));
        services.notification
          .closeNotification()
          .then(() => {
            // Update notification state
            AppLogger.debug("NOTIFICATIONS", "Notifications readed");
          })
          .catch((e: any) => AppLogger.error("NOTIFICATIONS", "Cannot read notifications", e));
      });
      return () => unsubscribe();
    }, [services, navigation, queryUpdater, user?.id, data.length, user]);

    const renderItem = ({ item }: { item: Notification }) => (
      <NotificationItem
        key={item.id!}
        notification={item}
        read={async () => {
          await services.notification.markAsRead(item.id!);
          const userIndex = item.recipients.findIndex(r => r.user === user?.id);
          item.recipients[userIndex] = { ...item.recipients[userIndex], readAt: new Date().toISOString() };
        }}
      />
    );

    return (
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        keyExtractor={i => i.id!}
        data={data}
        renderItem={renderItem}
        onEndReachedThreshold={0.2}
        onEndReached={fetchNextPage}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ alignItems: "center", marginBottom: insets.bottom }}>
              <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />
            </View>
          ) : (
            <View style={{ height: insets.bottom + 8 }} />
          )
        }
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ paddingTop: 8 }}
      />
    );
  },
  (repo, _, cursor) => repo.notification.list(cursor),
  NotificationQueryKey,
  NoNotificationView
);
export default NotificationScreen;
