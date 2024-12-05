import { LiveTripStatus, Trip } from "@liane/common";
import { useTripStatus } from "@/components/trip/trip";
import { AppText } from "@/components/base/AppText";
import React from "react";
import { ColorValue, StyleProp, ViewStyle } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";

type TripStatusViewProps = {
  trip: Trip;
  style?: StyleProp<ViewStyle>;
};

export function TripStatusView({ style, trip }: TripStatusViewProps) {
  const status = useTripStatus(trip);
  const [statusText] = getLianeStatusStyle(status!);
  if (!status) {
    return null;
  }
  return (
    <AppText
      style={[
        {
          paddingHorizontal: 16,
          paddingVertical: 6,
          color: AppColorPalettes.gray[400],
          fontWeight: "bold",
          fontStyle: "italic",
          borderWidth: 1,
          borderRadius: 20,
          borderColor: AppColorPalettes.gray[400]
        },
        style
      ]}>
      {statusText}
    </AppText>
  );
}

export const getLianeStatusStyle = (lianeStatus: LiveTripStatus): [string | undefined, ColorValue] => {
  let status;
  const color: ColorValue = AppColors.grayBackground;
  switch (lianeStatus) {
    case "StartingSoon":
      status = "Départ à venir";
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
    case "Archived":
      status = "Archivé";
      //  color = AppColorPalettes.gray[100];
      break;
  }
  return [status, color];
};
