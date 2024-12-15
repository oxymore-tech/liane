import { RallyingPoint } from "@liane/common";
import { ColorValue, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";
import React from "react";
import { MarkerView } from "../AppMapView";
import { AppStyles } from "@/theme/styles";

export type WayPointDisplayType = "to" | "from" | "step" | "pickup" | "deposit";
export const WayPointDisplay = ({
  rallyingPoint,
  type,
  active = true,
  size = 16,
  offsetY
}: // showIcon = true
{
  rallyingPoint: RallyingPoint;
  type: WayPointDisplayType;
  active?: boolean;
  size?: number;
  offsetY?: number;
}) => {
  let color: ColorValue = AppColors.primaryColor;
  let icon;

  switch (type) {
    case "to":
      icon = <AppIcon name="flag" color={AppColors.white} size={size} />;
      break;
    case "from":
      icon = <AppIcon name="pin" color={AppColors.white} size={size} />;
      break;
    case "pickup":
      icon = <AppIcon name="car" color={AppColors.white} size={size} />;
      break;
    case "deposit":
      icon = <AppIcon name="directions-walk" color={AppColors.white} size={size} />;
      break;
    default:
      icon = undefined;
  }

  if (!active) {
    color = AppColorPalettes.gray[400];
  }
  const showIcon = icon !== undefined;
  return (
    <MarkerView id={rallyingPoint.id!} coordinate={[rallyingPoint.location.lng, rallyingPoint.location.lat]}>
      <View
        style={[
          {
            padding: 4,
            alignItems: "center",
            justifyContent: "center",
            width: type !== "step" && showIcon ? size + 10 : 8,
            height: type !== "step" && showIcon ? size + 10 : 8,
            backgroundColor: color,
            borderRadius: 48,
            borderColor: AppColors.white,
            borderWidth: 1,
            position: "relative",
            top: offsetY
          },
          AppStyles.shadow
        ]}>
        {showIcon && icon}
      </View>
    </MarkerView>
  );
};
