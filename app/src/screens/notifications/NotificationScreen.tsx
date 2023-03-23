import React, { useContext } from "react";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { FlatList, RefreshControl, View } from "react-native";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { Notification } from "@/api";
import { AppText } from "@/components/base/AppText";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { toRelativeTimeString } from "@/api/i18n";
import { AppPressable } from "@/components/base/AppPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getNotificationNavigation, useAppNavigation } from "@/api/navigation";
import { AppContext } from "@/components/ContextProvider";

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
    const { services } = useContext(AppContext);

    const renderItem = ({ item }: { item: Notification }) => {
      const datetime = toRelativeTimeString(new Date(item.payload.createdAt!));
      const navigate = getNotificationNavigation(item.payload);
      return (
        <AppPressable
          key={item.payload.id}
          onPress={async () => {
            navigate(navigation);
            await services.notification.read(item.payload);
            refresh();
          }}>
          <Row style={{ paddingHorizontal: 24 }}>
            <View style={{ justifyContent: "center", padding: 4 }}>
              <View style={{ width: 8, height: 8, backgroundColor: AppColors.blue, opacity: item.payload.seen ? 0 : 1, borderRadius: 16 }} />
            </View>

            <Center style={{ paddingVertical: 24, paddingHorizontal: 8 }}>
              <AppIcon name={"message-square-outline"} />
            </Center>
            <Column style={{ justifyContent: "space-evenly", paddingVertical: 16, paddingHorizontal: 8, flexShrink: 1 }} spacing={2}>
              <AppText style={{ flexGrow: 1, fontSize: 14, fontWeight: item.payload.seen ? "normal" : "bold" }} numberOfLines={2}>
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
        keyExtractor={i => i.payload.id!}
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
