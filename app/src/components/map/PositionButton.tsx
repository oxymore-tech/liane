import React, { useContext, useState } from "react";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";
import { AppContext } from "@/components/ContextProvider";
import { LatLng } from "@/api";
import { AppPressable } from "@/components/base/AppPressable";
import { View } from "react-native";

export interface PositionButtonProps {
  onPosition: (position: LatLng) => Promise<void>;
  locationEnabled?: boolean;
}

export const PositionButton = ({ onPosition, locationEnabled = true }: PositionButtonProps) => {
  const { services } = useContext(AppContext);
  const [isApplyingLocation, setIsApplyingLocation] = useState(false);

  return (
    <AppPressable
      style={{ justifyContent: "center", alignItems: "center" }}
      onPress={async () => {
        try {
          const currentLocation = await services.location.currentLocation();
          if (__DEV__) {
            console.debug(currentLocation);
          }
          setIsApplyingLocation(true);
          await onPosition(currentLocation);
          setIsApplyingLocation(false);
        } catch (e) {
          console.error("location error :", e);
          // TODO show message to user
        }
      }}>
      <AppIcon name={locationEnabled ? "position-on" : "position-off"} color={AppColors.blue} />
      {isApplyingLocation && <View style={{ backgroundColor: AppColors.blue, padding: 6, position: "absolute", borderRadius: 8 }} />}
    </AppPressable>
  );
};
