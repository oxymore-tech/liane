import React, { useContext } from "react";
import { AppColorPalettes } from "@/theme/colors";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { AppText } from "@/components/base/AppText";
import { Center } from "@/components/base/AppLayout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppNavigation, getNotificationNavigation } from "@/api/navigation";
import { AppContext } from "@/components/context/ContextProvider";
import { Notification } from "@/api/notification";
import { NotificationItem } from "@/screens/notifications/NotificationItem";

export const NotificationQueryKey = "notification";

const NoNotificationView = () => {
  return (
    <Center>
      <AppText>Vous êtes à jour !</AppText>
    </Center>
  );
};

const NotificationScreen = WithFetchPaginatedResponse<Notification>(
  ({ data, refresh, refreshing, fetchNextPage, isFetchingNextPage }) => {
    const insets = useSafeAreaInsets();
    const { navigation } = useAppNavigation();
    const { services, user } = useContext(AppContext);

    const renderItem = ({ item }: { item: Notification }) => (
      <NotificationItem
        key={item.id!}
        notification={item}
        navigate={() => getNotificationNavigation(item)?.(navigation)}
        read={async () => {
          await services.notification.markAsRead(item);
          if (item.answers && item.answers.length > 0) {
            refresh();
          } else {
            const userIndex = item.recipients.findIndex(r => r.user === user?.id);
            item.recipients[userIndex] = { ...item.recipients[userIndex], seenAt: new Date().toISOString() };
          }
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
            <View style={{ alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : undefined
        }
        ItemSeparatorComponent={() => <View style={{ borderBottomWidth: 1, borderBottomColor: AppColorPalettes.gray[200], marginHorizontal: 24 }} />}
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ marginBottom: 80 + insets.bottom }}
      />
    );
  },
  (repo, _, cursor) => repo.notification.list(cursor),
  NotificationQueryKey,
  NoNotificationView
);
export default NotificationScreen;
