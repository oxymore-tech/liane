import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";

import { LatLng } from "@/api";

import { AppIcon } from "@/components/base/AppIcon";
import { AppContext } from "@/components/context/ContextProvider";
import { AppPressableOverlay } from "@/components/base/AppPressable";

import { AppColors, ContextualColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";

export interface PositionButtonProps {
  onPosition: (position: LatLng) => Promise<void>;
  onPositionError?: (e: any) => void;
  locationEnabled?: boolean;
}

export const PositionButton = ({ onPosition, locationEnabled = true, onPositionError }: PositionButtonProps) => {
  const { services } = useContext(AppContext);
  const [isApplyingLocation, setIsApplyingLocation] = useState(false);

  return (
    <AppPressableOverlay
      style={{ justifyContent: "center", alignItems: "center", height: 36 }}
      onPress={async () => {
        try {
          const currentLocation = await services.location.currentLocation();
          if (__DEV__) {
            console.debug("[PositionButton]", currentLocation);
          }
          setIsApplyingLocation(true);
          await onPosition(currentLocation);
          setIsApplyingLocation(false);
        } catch (e) {
          console.error("[PositionButton] location error :", e);
          // TODO show message to user
          if (onPositionError) {
            onPositionError(e);
          }
        }
      }}
      borderRadius={20}>
      <AppIcon
        size={22}
        name={locationEnabled ? "position-on" : "position-off"}
        color={locationEnabled ? AppColors.primaryColor : ContextualColors.redAlert.text}
      />
      <View style={styles.innerIcon} />
      {isApplyingLocation && locationEnabled && <View style={styles.innerIcon} />}
    </AppPressableOverlay>
  );
};

const styles = StyleSheet.create({
  innerIcon: {
    borderWidth: 2,
    borderColor: AppColors.primaryColor,
    padding: 1.5,
    position: "absolute",
    borderRadius: 8
  }
});
