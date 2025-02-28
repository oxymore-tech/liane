import { CoLiane, CoLianeMember, LianeMessage, Ref, Trip, User } from "@liane/common";
import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppLocalization } from "@/api/i18n.ts";
import { UserPicture } from "@/components/UserPicture.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppPressable } from "@/components/base/AppPressable.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";

type MessageBubblePros = {
  liane?: CoLiane;
  message: LianeMessage;
  isSender: boolean;
  renderSender?: boolean;
  activeTrips: Record<string, Trip>;
};

export const MessageBubble = ({ liane, message, isSender, renderSender, activeTrips }: MessageBubblePros) => {
  const { navigation } = useAppNavigation();
  const [loading, setLoading] = useState(false);

  const allMembers = useMemo<Record<Ref<User>, CoLianeMember>>(() => {
    if (!liane) {
      return {};
    }
    return Object.fromEntries([...liane.members, ...liane.pendingMembers].map(m => [m.user.id, m]));
  }, [liane]);

  const sender = allMembers[message.createdBy!];

  const createdAt = useMemo(() => AppLocalization.formatTime(new Date(message.createdAt!)), [message.createdAt]);

  const backgroundColor = message.content.type === "Text" ? (isSender ? "#0D1C2E" : AppColorPalettes.gray[700]) : "transparent";
  const color = message.content.type !== "Text" ? AppColors.darkGray : isSender ? AppColorPalettes.gray[300] : AppColorPalettes.gray[200];

  const pendingMember = useMemo(() => {
    if (!liane) {
      return;
    }
    return liane.pendingMembers.find(u => u.user.id === message.createdBy);
  }, [liane, message.createdBy]);

  const handlePendingMember = useCallback(async () => {
    if (!liane || !pendingMember) {
      return;
    }
    if (message.content.type !== "MemberRequested") {
      return;
    }
    setLoading(true);
    try {
      navigation.push("LianeMapDetail", { liane: liane, request: pendingMember.lianeRequest });
    } finally {
      setLoading(false);
    }
  }, [liane, message.content.type, navigation, pendingMember]);

  const trip = useMemo(() => {
    if (message.content.type !== "TripAdded") {
      return;
    }
    const activeTrip = activeTrips[message.content.trip];
    if (activeTrip) {
      return activeTrip;
    }

    if (!message.content.return) {
      return;
    }

    return activeTrips[message.content.return];
  }, [activeTrips, message.content]);

  const navigateToTrip = useCallback(() => {
    if (!trip) {
      return;
    }
    navigation.popToTop();
    // @ts-ignore
    navigation.navigate("Home", { screen: "Calendrier", params: { trip: trip.id! } });
  }, [navigation, trip]);

  if (message.content.type !== "Text") {
    return (
      <AppPressable
        disabled={!trip}
        onPress={navigateToTrip}
        style={{ backgroundColor: "rgba(46,46,46,0.2)", justifyContent: "center", marginBottom: 6, paddingHorizontal: 8 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Row spacing={5}>
            {message.content.type === "TripAdded" && trip && <AppIcon name="calendar" color={AppColors.white} />}
            {message.content.type === "MemberHasStarted" && <AppIcon name="car" color={AppColors.white} />}
            <AppText
              style={{
                fontSize: 14,
                color: AppColors.white,
                fontStyle: "italic"
              }}
              numberOfLines={4}>
              {message.content.value}
            </AppText>
          </Row>
          <AppText
            style={{
              fontSize: 12,
              color: AppColors.white
            }}
            numberOfLines={4}>
            {createdAt}
          </AppText>
        </Row>
        {message.content.type === "MemberRequested" && pendingMember && message.createdAt === pendingMember.joinedAt && (
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
        marginHorizontal: 8
      }}>
      {!isSender && renderSender && <UserPicture url={sender?.user.pictureUrl} id={sender?.user.id} size={32} />}
      {!isSender && !renderSender && <View style={{ width: 32 }} />}
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
        {!isSender && renderSender && (
          <AppText style={{ alignSelf: "flex-start", fontSize: 14, fontWeight: "bold", color: AppColorPalettes.gray[100] }}>
            {sender?.user.pseudo ?? "Utilisateur Inconnu"}
          </AppText>
        )}
        <AppText numberOfLines={-1} style={{ fontSize: 18, color }}>
          {message.content.value}
        </AppText>
        <AppText style={{ fontSize: 12, color: AppColorPalettes.gray[400], alignSelf: isSender ? "flex-end" : "flex-start" }}>{createdAt}</AppText>
      </Column>
    </Row>
  );
};
