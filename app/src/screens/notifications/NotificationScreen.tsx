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
import { useAppNavigation } from "@/api/navigation";
import { getNotificationContent } from "@/api/service/notification";
import { AppContext } from "@/components/ContextProvider";

const NotificationQueryKey = "notification";

const NoNotificationView = () => {
  return (
    <Center>
      <AppText>Vous êtes à jour !</AppText>
    </Center>
  );
};

const NotificationScreen = WithFetchPaginatedResponse<Notification<any>>(
  ({ data, refresh, refreshing }) => {
    const insets = useSafeAreaInsets();
    const { navigation } = useAppNavigation();
    const { user, services } = useContext(AppContext);

    const renderItem = ({ item }: { item: Notification<any> }) => {
      const datetime = toRelativeTimeString(new Date(item.createdAt!));
      const { body, navigate } = getNotificationContent(item, user!);
      console.log(item);
      return (
        <AppPressable
          key={item.id}
          onPress={() => {
            navigate(navigation);
            services.notification.read(item.id!).then(updated => {
              if (updated) {
                refresh();
              }
            });
          }}>
          <Row style={{ paddingHorizontal: 24 }}>
            <View style={{ justifyContent: "center", padding: 4 }}>
              <View style={{ width: 8, height: 8, backgroundColor: AppColors.blue, opacity: item.seen ? 0 : 1, borderRadius: 16 }} />
            </View>

            <Center style={{ paddingVertical: 24, paddingHorizontal: 8 }}>
              <AppIcon name={"message-square-outline"} />
            </Center>
            <Column style={{ justifyContent: "space-evenly", paddingVertical: 16, paddingHorizontal: 8, flexShrink: 1 }} spacing={2}>
              <AppText style={{ flexGrow: 1, fontSize: 14, fontWeight: item.seen ? "normal" : "bold" }} numberOfLines={2}>
                {body}
              </AppText>
              <AppText style={{ color: AppColorPalettes.gray[500] }}>{datetime}</AppText>
            </Column>
          </Row>
        </AppPressable>
      );
    };
    return (
      <View>
        <FlatList
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          keyExtractor={i => i.id}
          data={data}
          renderItem={renderItem}
          ItemSeparatorComponent={() => (
            <View style={{ borderBottomWidth: 1, borderBottomColor: AppColorPalettes.gray[200], marginHorizontal: 24 }} />
          )}
          style={{ marginBottom: 80 + insets.bottom }}
        />
      </View>
    );
  },
  repo => repo.notification.list(),
  NotificationQueryKey,
  NoNotificationView
);
export default NotificationScreen;
