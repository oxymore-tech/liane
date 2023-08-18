import { Liane } from "@/api";
import { useLianeStatus, LianeStatus } from "@/components/trip/trip";
import { AppText } from "@/components/base/AppText";
import React from "react";
import { ColorValue, View } from "react-native";
import { AppColorPalettes } from "@/theme/colors";

export const LianeStatusView = ({ liane }: { liane: Liane }) => {
  const lianeStatus = useLianeStatus(liane);
  const [statusText, color] = getLianeStatusStyle(lianeStatus);
  if (!statusText) {
    return null;
  }
  return (
    <View
      style={{
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: color
      }}>
      <AppText>{statusText}</AppText>
    </View>
  );
};

const getLianeStatusStyle = (lianeStatus: LianeStatus): [string | undefined, ColorValue] => {
  let status;
  let color: ColorValue = AppColorPalettes.gray[100];
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
