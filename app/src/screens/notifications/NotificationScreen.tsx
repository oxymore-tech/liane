import React, { useContext } from "react";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { FlatList, RefreshControl, View } from "react-native";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { AppText } from "@/components/base/AppText";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { toRelativeTimeString } from "@/api/i18n";
import { AppPressable } from "@/components/base/AppPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppNavigation, getNotificationNavigation } from "@/api/navigation";
import { AppContext } from "@/components/ContextProvider";
import { Notification } from "@/api/notification";
import { capitalize } from "@/util/strings";
import { UnionUtils } from "@/api";
import { MemberAccepted, MemberHasLeft } from "@/api/event";

export const NotificationQueryKey = "notification";

const NoNotificationView = () => {
  return (
    <Center>
      <AppText>Vous êtes à jour !</AppText>
    </Center>
  );
};

const NotificationScreen = WithFetchPaginatedResponse<Notification>(
  ({ data, refresh, refreshing }) => {
    const insets = useSafeAreaInsets();
    const { navigation } = useAppNavigation();
    const { services, user } = useContext(AppContext);

    const renderItem = ({ item }: { item: Notification }) => {
      const seen = !!item.recipients.find(r => r.user === user?.id)?.seenAt;
      const datetime = capitalize(toRelativeTimeString(new Date(item.sentAt!)));
      const navigate = getNotificationNavigation(item);
      return (
        <AppPressable
          key={item.id}
          onPress={async () => {
            if (navigate) {
              navigate(navigation);
            }
            if (!seen) {
              await services.notification.markAsRead(item);
              refresh();
            }
          }}>
          <Row style={{ paddingHorizontal: 24 }}>
            <View style={{ justifyContent: "center", padding: 4 }}>
              <View style={{ width: 8, height: 8, backgroundColor: AppColors.blue, opacity: seen ? 0 : 1, borderRadius: 16 }} />
            </View>

            <Center style={{ paddingVertical: 24, paddingHorizontal: 8 }}>
              <AppIcon name={"message-square-outline"} />
            </Center>
            <Column style={{ justifyContent: "space-evenly", paddingVertical: 16, paddingHorizontal: 8, flexShrink: 1 }} spacing={2}>
              <AppText style={{ flexGrow: 1, fontSize: 14, fontWeight: seen ? "normal" : "bold" }} numberOfLines={4}>
                {item.message}
              </AppText>
              <AppText style={{ color: AppColorPalettes.gray[500] }}>{datetime}</AppText>
            </Column>
          </Row>
        </AppPressable>
      );
    };
    return (
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        keyExtractor={i => i.id!}
        data={data}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ borderBottomWidth: 1, borderBottomColor: AppColorPalettes.gray[200], marginHorizontal: 24 }} />}
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ marginBottom: 80 + insets.bottom }}
      />
    );
  },
  repo => repo.notification.list(),
  NotificationQueryKey,
  NoNotificationView
);
export default NotificationScreen;
