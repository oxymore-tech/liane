import { AppText } from "@/components/base/AppText.tsx";
import { AppColors } from "@/theme/colors.ts";
import { CoLiane, LianeMessage, MemberRequested } from "@liane/common";
import React, { useCallback, useContext } from "react";
import { Row } from "@/components/base/AppLayout.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { AppPressableOverlay } from "@/components/base/AppPressable.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { View } from "react-native";

export const MemberRequestedButton = ({ message, coLiane }: { message: LianeMessage<MemberRequested>; coLiane: CoLiane }) => {
  const { services } = useContext(AppContext);

  const handleAccept = useCallback(async () => {
    await services.community.accept(message.content.lianeRequest, coLiane.id!);
  }, [coLiane.id, message.content.lianeRequest, services.community]);

  const handleReject = useCallback(async () => {
    await services.community.reject(message.content.lianeRequest, coLiane.id!);
  }, [coLiane.id, message.content.lianeRequest, services.community]);

  return (
    <Row
      style={{
        justifyContent: "space-between"
      }}>
      <View style={{ marginRight: 7 }}>
        <AppPressableOverlay
          backgroundStyle={{ backgroundColor: AppColors.primaryColor, borderRadius: 8 }}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          onPress={handleAccept}>
          <Row style={{ alignItems: "center" }} spacing={6}>
            <AppText style={{ color: AppColors.white, fontWeight: "bold", fontSize: 18 }}>Accepter</AppText>
          </Row>
        </AppPressableOverlay>
      </View>
      <View>
        <AppPressableOverlay
          backgroundStyle={{ backgroundColor: AppColors.grayBackground, borderRadius: 8 }}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          onPress={handleReject}>
          <Row style={{ alignItems: "center" }} spacing={6}>
            <AppText style={{ color: AppColors.white, fontWeight: "bold", fontSize: 18 }}>Décliner</AppText>
          </Row>
        </AppPressableOverlay>
      </View>
    </Row>
  );
};
