import React, { useContext } from "react";
import { Pressable } from "react-native";
import { AppCustomIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";
import { AppContext } from "@/components/ContextProvider";
import { LatLng } from "@/api";

export interface PositionButtonProps {
  onPosition: (position: LatLng) => void | Promise<void>;
}

export const PositionButton = ({ onPosition }: PositionButtonProps) => {
  const { services } = useContext(AppContext);
  return (
    <Pressable
      style={{ height: "100%", width: 36, justifyContent: "center", alignItems: "center" }}
      onPress={async () => {
        try {
          const currentLocation = await services.location.currentLocation();
          if (__DEV__) {
            console.log(currentLocation);
          }
          onPosition(currentLocation);
        } catch (e) {
          console.error("location error :", e);
          // TODO show message to user
        }
      }}>
      <AppCustomIcon name={"position"} color={AppColors.blue} />
    </Pressable>
  );
};
