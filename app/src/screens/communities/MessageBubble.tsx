import { capitalize, CoLiane, CoLianeMember, LianeMessage, Ref, User } from "@liane/common";
import React, { useCallback, useContext, useMemo, useState } from "react";
import { View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppLocalization } from "@/api/i18n.ts";
import { UserPicture } from "@/components/UserPicture.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";

export const MessageBubble = ({
  coLiane,
  message,
  isSender,
  previousSender
}: {
  coLiane: CoLiane;
  message: LianeMessage;
  isSender: boolean;
  previousSender?: Ref<User> | undefined;
}) => {
  const { services } = useContext(AppContext);
  const { navigation } = useAppNavigation();
  const [loading, setLoading] = useState(false);

  const allMembers = useMemo<Record<Ref<User>, CoLianeMember>>(() => {
    return Object.fromEntries([...coLiane.members, ...coLiane.pendingMembers].map(m => [m.user.id, m]));
  }, [coLiane.members, coLiane.pendingMembers]);

  const sender = allMembers[message.createdBy!];

  const firstBySender = previousSender !== sender?.user.id;
  const date = capitalize(AppLocalization.toRelativeTimeString(new Date(message.createdAt!)));

  const backgroundColor = message.content.type === "Text" ? (isSender ? AppColors.primaryColor : AppColors.secondaryColor) : "transparent";
  const color = message.content.type !== "Text" ? AppColors.darkGray : isSender ? AppColors.white : AppColors.white;

  const handlePendingMember = useCallback(async () => {
    if (message.content.type !== "MemberRequested") {
      return;
    }
    setLoading(true);
    try {
      const request = await services.community.get(message.content.lianeRequest);
      navigation.push("LianeMapDetail", { liane: coLiane, request });
    } finally {
      setLoading(false);
    }
  }, [coLiane, message.content, navigation, services.community]);

  if (message.content.type !== "Text") {
    return (
      <Column
        style={{
          marginBottom: 6,
          backgroundColor: AppColorPalettes.gray[700],
          borderRadius: 8,
          padding: 8
        }}>
        <Row style={{ justifyContent: "center" }}>
          <Center style={{ flex: 1 }}>
            <AppText style={{ fontSize: 12, color: AppColorPalettes.gray[400] }}>{message.content.value}</AppText>
          </Center>
          {message.content.type === "TripAdded" && <AppIcon name="liane" color={AppColors.white} size={24} />}
        </Row>
        {message.content.type === "MemberRequested" && coLiane.pendingMembers.find(u => u.user.id === message.createdBy) && (
          <Center>
            <AppButton onPress={handlePendingMember} color={AppColors.secondaryColor} value="Voir la demande" loading={loading} />
          </Center>
        )}
        <AppText style={{ fontSize: 10, color: AppColorPalettes.gray[400], alignSelf: "flex-end" }}>{date}</AppText>
      </Column>
    );
  }

  return (
    <Row
      spacing={8}
      style={{
        marginBottom: 6,
        alignSelf: isSender ? "flex-end" : "flex-start",
        marginTop: firstBySender ? 6 : 0
      }}>
      {!isSender && firstBySender && <UserPicture url={sender?.user.pictureUrl} id={sender?.user.id} size={32} />}
      {!isSender && !firstBySender && <View style={{ width: 32 }} />}
      <Column spacing={2}>
        <Column
          style={{
            backgroundColor,
            alignSelf: isSender ? "flex-end" : "flex-start",
            paddingVertical: message.content.type === "Text" ? 8 : 2,
            paddingHorizontal: 12,
            borderBottomRightRadius: 8,
            borderBottomLeftRadius: 8,
            borderTopLeftRadius: isSender ? 8 : firstBySender ? 0 : 8,
            borderTopRightRadius: isSender ? (firstBySender ? 0 : 8) : 8,
            marginRight: isSender ? 0 : 56,
            marginLeft: isSender ? 56 : 0
          }}
          spacing={4}>
          {!isSender && firstBySender && (
            <AppText style={{ alignSelf: "flex-start", fontSize: 14, fontWeight: "bold", color: AppColorPalettes.blue[900] }}>
              {sender?.user.pseudo}
            </AppText>
          )}
          <AppText numberOfLines={-1} style={{ fontSize: 15, color }}>
            {message.content.value}
          </AppText>
          <AppText style={{ fontSize: 12, alignSelf: isSender ? "flex-end" : "flex-start", color }}>{date}</AppText>
        </Column>
      </Column>
    </Row>
  );
};
