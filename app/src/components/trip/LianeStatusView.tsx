import { DetailedTripStatus, Liane } from "@liane/common";
import { useTripStatus } from "@/components/trip/trip";
import { AppText } from "@/components/base/AppText";
import React from "react";
import { ColorValue, StyleProp, ViewStyle } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";

export type LianeStatusViewProps = {
  liane: Liane;
  style?: StyleProp<ViewStyle>;
};

export const LianeStatusView = ({ style, liane }: LianeStatusViewProps) => {
  const lianeStatus = useTripStatus(liane);
  const [statusText] = getLianeStatusStyle(lianeStatus!);
  if (!statusText) {
    return null;
  }
  return (
    <AppText
      style={[
        {
          paddingHorizontal: 6,
          paddingVertical: 6,
          color: AppColorPalettes.gray[400],
          fontWeight: "bold",
          fontStyle: "italic"
        },
        style
      ]}>
      {statusText}
    </AppText>
  );
};

const getLianeStatusStyle = (lianeStatus: DetailedTripStatus): [string | undefined, ColorValue] => {
  let status;
  let color: ColorValue = AppColors.grayBackground;
  switch (lianeStatus) {
    case "StartingSoon":
      status = "Départ imminent";
      //  color = AppColorPalettes.yellow[100];
      break;
    case "Started":
      status = "En cours";
      //  color = ContextualColors.greenValid.light;
      break;
    case "Finished":
      status = "Terminé";
      // color = AppColorPalettes.blue[100];
      break;
    case "Canceled":
      status = "Annulé";
      // color = ContextualColors.redAlert.light;
      break;
    case "AwaitingDriver":
      status = "Sans conducteur";
      //  color = ContextualColors.redAlert.light;
      break;
    case "AwaitingPassengers":
      status = "En attente de passagers";
      // color = AppColorPalettes.gray[100];
      break;
    case "Archived":
      status = "Archivé";
      //  color = AppColorPalettes.gray[100];
      break;
  }
  return [status, color];
};
