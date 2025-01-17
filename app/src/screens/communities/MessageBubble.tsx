import { capitalize, CoLiane, CoLianeMember, LianeMessage, Ref, User } from "@liane/common";
import React, { useCallback, useContext, useMemo, useState } from "react";
import { View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppLocalization } from "@/api/i18n.ts";
import { UserPicture } from "@/components/UserPicture.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { AppPressable } from "@/components/base/AppPressable.tsx";

type MessageBubblePros = {
  liane?: CoLiane;
  message: LianeMessage;
  isSender: boolean;
  renderSender?: boolean;
};

export const MessageBubble = ({ liane, message, isSender, renderSender }: MessageBubblePros) => {
  const { services } = useContext(AppContext);
  const { navigation } = useAppNavigation();
  const [loading, setLoading] = useState(false);

  const allMembers = useMemo<Record<Ref<User>, CoLianeMember>>(() => {
    if (!liane) {
      return {};
    }
    return Object.fromEntries([...liane.members, ...liane.pendingMembers].map(m => [m.user.id, m]));
  }, [liane]);

  const sender = allMembers[message.createdBy!];

  const date = capitalize(AppLocalization.formatTime(new Date(message.createdAt!)));

  const backgroundColor = message.content.type === "Text" ? (isSender ? "#0D1C2E" : AppColorPalettes.gray[700]) : "transparent";
  const color = message.content.type !== "Text" ? AppColors.darkGray : isSender ? AppColorPalettes.gray[300] : AppColorPalettes.gray[200];

  const handlePendingMember = useCallback(async () => {
    if (!liane) {
      return;
    }
    if (message.content.type !== "MemberRequested") {
      return;
    }
    setLoading(true);
    try {
      const request = await services.community.get(message.content.lianeRequest);
      navigation.push("LianeMapDetail", { liane: liane, request });
    } finally {
      setLoading(false);
    }
  }, [liane, message.content, navigation, services.community]);

  if (message.content.type !== "Text") {
    return (
      <AppPressable
        disabled={message.content.type !== "TripAdded"}
        onPress={() => {
          if (message.content.type === "TripAdded") {
            // @ts-ignore
            navigation.navigate("Home", { screen: "Calendrier", params: { trip: message.content.trip } });
          }
        }}
        style={{}}>
        <Center
          style={{
            width: "100%"
          }}>
          <AppText
            style={{
              fontSize: 14,
              color: AppColorPalettes.gray[200],
              fontStyle: "italic"
            }}
            numberOfLines={4}>
            {message.content.value}
          </AppText>
        </Center>
        {message.content.type === "MemberRequested" && liane && liane.pendingMembers.find(u => u.user.id === message.createdBy) && (
          <Center>
            <AppButton onPress={handlePendingMember} color={AppColors.secondaryColor} value="Voir la demande" loading={loading} />
          </Center>
        )}
      </AppPressable>
    );
  }

  return (
    <Row
      spacing={8}
      style={{
        marginBottom: 6,
        alignSelf: isSender ? "flex-end" : "flex-start",
        marginTop: renderSender ? 6 : 0
      }}>
      {!isSender && renderSender && <UserPicture url={sender?.user.pictureUrl} id={sender?.user.id} size={32} />}
      {!isSender && !renderSender && <View style={{ width: 32 }} />}
      <Column spacing={2}>
        {!isSender && renderSender && (
          <AppText style={{ alignSelf: "flex-start", fontSize: 14, fontWeight: "bold", color: AppColorPalettes.gray[100] }}>
            {sender?.user.pseudo}
          </AppText>
        )}
        <Column
          style={{
            backgroundColor,
            alignSelf: isSender ? "flex-end" : "flex-start",
            paddingVertical: message.content.type === "Text" ? 8 : 2,
            paddingHorizontal: 12,
            borderBottomRightRadius: 8,
            borderBottomLeftRadius: 8,
            borderTopLeftRadius: isSender ? 8 : renderSender ? 0 : 8,
            borderTopRightRadius: isSender ? (renderSender ? 0 : 8) : 8,
            marginRight: isSender ? 0 : 56,
            marginLeft: isSender ? 56 : 0
          }}
          spacing={4}>
          <AppText numberOfLines={-1} style={{ fontSize: 18, color }}>
            {message.content.value}
          </AppText>
          <AppText style={{ fontSize: 12, color: AppColorPalettes.gray[400], alignSelf: isSender ? "flex-end" : "flex-start" }}>{date}</AppText>
        </Column>
      </Column>
    </Row>
  );
};
