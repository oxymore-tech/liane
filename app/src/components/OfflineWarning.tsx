import { AppColors, ContextualColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { Row, Space } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { ActivityIndicator } from "react-native";
import { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import Animated, { SlideInDown } from "react-native-reanimated";

export const OfflineWarning = () => {
  const { hubState } = useContext(AppContext);
  if (!hubState) {
    return null;
  }
  if (!["offline", "reconnecting"].includes(hubState)) {
    return null;
  }
  const isReconnecting = hubState === "reconnecting";
  return (
    <Animated.View style={{ position: "absolute", bottom: 60, left: 24, right: 24 }} entering={SlideInDown}>
      <Row spacing={16} style={{ borderRadius: 8, backgroundColor: ContextualColors.redAlert.bg, padding: 16, alignItems: "center" }}>
        <AppIcon name={"wifi-off-outline"} color={AppColors.white} />
        <AppText style={{ fontWeight: "bold", color: AppColors.white }}>{isReconnecting ? "Reconnexion..." : "Réseau indisponible"}</AppText>
        <Space />
        {isReconnecting && <ActivityIndicator size={"small"} color={AppColors.white} />}
      </Row>
    </Animated.View>
  );
};
