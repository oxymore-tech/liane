import { AppColors, ContextualColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";

export const OfflineWarning = () => (
  <Row spacing={16} style={{ borderRadius: 8, backgroundColor: ContextualColors.redAlert.bg, padding: 16, alignItems: "center" }}>
    <AppIcon name={"wifi-off-outline"} color={AppColors.white} />
    <AppText style={{ fontWeight: "bold", color: AppColors.white }}>Réseau indisponible</AppText>
  </Row>
);
