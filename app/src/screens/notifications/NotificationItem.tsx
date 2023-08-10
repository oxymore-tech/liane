import { Notification } from "@/api/notification";
import { capitalize } from "@/util/strings";
import { toRelativeTimeString } from "@/api/i18n";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import React, { useContext, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";

export const NotificationItem = ({ notification: item, navigate, read }: { notification: Notification; navigate: () => void; read: () => void }) => {
  const { user } = useContext(AppContext);
  const userIndex = item.recipients.findIndex(r => r.user === user?.id);
  const [seen, setSeen] = useState(userIndex >= 0 && !!item.recipients[userIndex].seenAt);
  const datetime = capitalize(toRelativeTimeString(new Date(item.createdAt!)));

  return (
    <AppPressableOverlay
      key={item.id}
      onPress={() => {
        navigate();
        if (!seen) {
          read();
          setSeen(true);
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
    </AppPressableOverlay>
  );
};
