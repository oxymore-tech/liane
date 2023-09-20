import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";

import { LatLng } from "@/api";

import { AppIcon } from "@/components/base/AppIcon";
import { AppContext } from "@/components/context/ContextProvider";
import { AppPressable } from "@/components/base/AppPressable";

import { AppColors, ContextualColors } from "@/theme/colors";

export interface PositionButtonProps {
  onPosition: (position: LatLng) => Promise<void>;
  onPositionError?: (e: any) => void;
  locationEnabled?: boolean;
}

export const PositionButton = ({ onPosition, locationEnabled = true, onPositionError }: PositionButtonProps) => {
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
          if (onPositionError) {
            onPositionError(e);
          }
        }
      }}>
      <AppIcon
        size={22}
        name={locationEnabled ? "position-on" : "position-off"}
        color={locationEnabled ? AppColors.secondaryColor : ContextualColors.redAlert.text}
      />
      <View style={styles.innerIcon} />
      {isApplyingLocation && locationEnabled && <View style={styles.innerIcon} />}
    </AppPressable>
  );
};

const styles = StyleSheet.create({
  innerIcon: {
    borderWidth: 2,
    borderColor: AppColors.secondaryColor,
    padding: 1.5,
    position: "absolute",
    borderRadius: 8
  }
});
