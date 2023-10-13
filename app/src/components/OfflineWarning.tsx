import { AppColors, ContextualColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { ActivityIndicator, View } from "react-native";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import Animated, { SlideInDown } from "react-native-reanimated";

export const OfflineWarning = () => {
  const { status, reconnect } = useContext(AppContext);
  if (!["offline", "reconnecting"].includes(status)) {
    return null;
  }
  const isReconnecting = status === "reconnecting";
  return (
    <Animated.View style={{ position: "absolute", bottom: 96, left: 24, right: 24 }} entering={SlideInDown}>
      <Row spacing={16} style={{ borderRadius: 8, backgroundColor: ContextualColors.redAlert.bg, padding: 16, alignItems: "center" }}>
        <AppIcon name={"wifi-off-outline"} color={AppColors.white} />
        <AppText style={{ fontWeight: "bold", color: AppColors.white }}>{isReconnecting ? "Reconnexion..." : "Réseau indisponible"}</AppText>
        <View style={{ flex: 1 }} />
        {isReconnecting ? (
          <ActivityIndicator size={"small"} color={AppColors.white} />
        ) : (
          <AppPressableIcon name={"refresh"} color={AppColors.white} onPress={reconnect} />
        )}
      </Row>
    </Animated.View>
  );
};
