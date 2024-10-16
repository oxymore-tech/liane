import { capitalize, Notification } from "@liane/common";
import { AppLocalization } from "@/api/i18n";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import React, { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { getNotificationNavigation, useAppNavigation } from "@/components/context/routing";

export const NotificationItem = ({ notification: item, read }: { notification: Notification; read: () => void }) => {
  const { user } = useContext(AppContext);
  const userIndex = item.recipients.findIndex(r => r.user === user?.id);
  const seen = userIndex >= 0 && !!item.recipients[userIndex].readAt;
  const datetime = capitalize(AppLocalization.toRelativeTimeString(new Date(item.createdAt!)));
  const { navigation } = useAppNavigation();

  let icon: IconName = "message-square-outline";
  const nav = getNotificationNavigation(item);
  return (
    <AppPressableOverlay
      clickable={!!nav}
      backgroundStyle={{ backgroundColor: AppColors.white, borderRadius: 16, marginHorizontal: 16, marginVertical: 4 }}
      key={item.id}
      onPress={() => {
        if (nav) {
          nav(navigation);
        }
        read();
      }}>
      <Column style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Row>
          <Center style={{ paddingHorizontal: 8, paddingTop: 12 }}>
            <AppIcon name={icon} />
          </Center>
          <Column style={{ justifyContent: "space-evenly", paddingHorizontal: 8, flexShrink: 1 }} spacing={2}>
            <AppText style={{ color: AppColorPalettes.gray[500] }}>{datetime}</AppText>
            <AppText style={{ flexGrow: 1, fontSize: 14, fontWeight: seen ? "normal" : "bold" }} numberOfLines={4}>
              {item.message}
            </AppText>
          </Column>
        </Row>
        {/* TODO <View style={{ paddingLeft: 40 }}>{UnionUtils.isInstanceOf<Event>(item, "Event") && <LianeEventView event={item} />}</View>*/}
      </Column>
    </AppPressableOverlay>
  );
};
