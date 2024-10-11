import { capitalize, CoLiane, LianeMessage, Ref, MemberRequested, User } from "@liane/common";
import React from "react";
import { View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppLocalization } from "@/api/i18n.ts";
import { UserPicture } from "@/components/UserPicture.tsx";
import { MemberRequestedButton } from "@/components/trip/MemberRequestedButton.tsx";

export const MessageBubble = ({
  coLiane,
  message,
  sender,
  isSender,
  previousSender
}: {
  coLiane: CoLiane;
  message: LianeMessage;
  sender: User;
  isSender: boolean;
  previousSender?: Ref<User> | undefined;
}) => {
  const firstBySender = previousSender !== sender.id;
  const date = capitalize(AppLocalization.toRelativeTimeString(new Date(message.createdAt!)));
  const backgroundColor = message.content.type === "Text" ? (isSender ? AppColors.primaryColor : AppColors.secondaryColor) : AppColors.white;
  const color = message.content.type === "Text" ? AppColors.white : isSender ? AppColors.primaryColor : AppColors.secondaryColor;
  return (
    <Row
      spacing={8}
      style={{
        marginBottom: 6,
        alignSelf: isSender ? "flex-end" : "flex-start",
        marginTop: firstBySender ? 6 : 0
      }}>
      {!isSender && firstBySender && <UserPicture url={sender.pictureUrl} id={sender.id} size={32} />}
      {!isSender && !firstBySender && <View style={{ width: 32 }} />}
      <Column spacing={2}>
        {!isSender && firstBySender && (
          <AppText style={{ marginLeft: 6, alignSelf: "flex-start", fontSize: 14, fontWeight: "bold", color: AppColorPalettes.blue[800] }}>
            {sender.pseudo}
          </AppText>
        )}
        <Column
          style={{
            backgroundColor,
            alignSelf: isSender ? "flex-end" : "flex-start",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderBottomRightRadius: 8,
            borderBottomLeftRadius: 8,
            borderTopLeftRadius: isSender ? 8 : firstBySender ? 0 : 8,
            borderTopRightRadius: isSender ? (firstBySender ? 0 : 8) : 8,
            marginRight: isSender ? 0 : 56,
            marginLeft: isSender ? 56 : 0
          }}
          spacing={4}>
          {message.content.type === "Text" && (
            <>
              <AppText numberOfLines={-1} style={{ fontSize: 15, color }}>
                {message.content.value}
              </AppText>
              <AppText style={{ fontSize: 12, alignSelf: isSender ? "flex-end" : "flex-start", color }}>{date}</AppText>
            </>
          )}
          {message.content.type !== "Text" && (
            <>
              <AppText numberOfLines={-1} style={{ fontSize: 12 }}>
                {message.content.value}
              </AppText>
              {message.content.type === "MemberRequested" && (
                <MemberRequestedButton message={message as LianeMessage<MemberRequested>} coLiane={coLiane} />
              )}
              <AppText style={{ fontSize: 12, alignSelf: isSender ? "flex-end" : "flex-start", color }}>{date}</AppText>
            </>
          )}
        </Column>
      </Column>
    </Row>
  );
};
