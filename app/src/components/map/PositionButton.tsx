import React, { useContext } from "react";
import { Pressable } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";
import { AppContext } from "@/components/ContextProvider";
import { LatLng } from "@/api";
import { AppPressable } from "@/components/base/AppPressable";

export interface PositionButtonProps {
  onPosition: (position: LatLng) => void | Promise<void>;
}

export const PositionButton = ({ onPosition }: PositionButtonProps) => {
  const { services } = useContext(AppContext);
  return (
    <AppPressable
      style={{ justifyContent: "center", alignItems: "center" }}
      onPress={async () => {
        try {
          const currentLocation = await services.location.currentLocation();
          if (__DEV__) {
            console.debug(currentLocation);
          }
          onPosition(currentLocation);
        } catch (e) {
          console.error("location error :", e);
          // TODO show message to user
        }
      }}>
      <AppIcon name={"position"} color={AppColors.blue} />
    </AppPressable>
  );
};
