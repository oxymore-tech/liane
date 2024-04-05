import { LatLng, User } from "@liane/common";
import { StyleSheet, Text, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { UserPicture } from "@/components/UserPicture";
import React from "react";
import { MarkerView, useAppMapViewController } from "../AppMapView";
import { AppStyles } from "@/theme/styles";
import Svg, { Path } from "react-native-svg";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { AppLocalization } from "@/api/i18n";
import { useSubscriptionValue } from "@/util/hooks/subscription";

export const TripMemberDisplay = ({
  location,
  user,
  active = true,
  size = 32,
  showLocationPin = true,
  minZoom,
  delay,
  isMoving
}: // showIcon = true
{
  location: LatLng;
  user: User;
  active?: boolean;
  size?: number;
  showLocationPin?: boolean;
  minZoom?: number | undefined;
  delay?: number | undefined;
  isMoving: boolean;
}) => {
  const controller = useAppMapViewController();
  const region = useSubscriptionValue(controller.subscribeToRegionChanges);
  const zoom = region?.zoomLevel || 10;
  const formattedDelay = delay ? AppLocalization.formatDuration(delay) : undefined;
  const description = isMoving ? (formattedDelay ? " arrive dans " + formattedDelay : "") : "est à l'arrêt";
  if (minZoom && zoom <= minZoom) {
    return null;
  }
  return (
    <MarkerView id={user.id!} coordinate={[location.lng, location.lat]} anchor={{ x: 0.5, y: 1 }}>
      <Animated.View entering={FadeIn} exiting={FadeOut} pointerEvents="none" style={[styles.wayPointContainer, { bottom: -4 }]}>
        {
          <View style={styles.wayPointContainer}>
            {zoom > 7.5 && (
              <Animated.View style={styles.userNameContainer} entering={ZoomIn}>
                <Text style={styles.userNameText}>{user.pseudo + description}</Text>
              </Animated.View>
            )}
            <View
              style={[
                styles.userPictureContainer,
                { borderRadius: size, width: size, height: size, borderColor: active ? AppColors.primaryColor : AppColorPalettes.gray[400] }
              ]}>
              <UserPicture url={user.pictureUrl} id={user.id} size={size - 8} />
            </View>
          </View>
        }

        <Svg width="10" height="16" viewBox="0 0 13 18" fill="none" opacity={showLocationPin ? 1 : 0} transform={[{ translateY: -4 }]}>
          <Path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M0.63916 0.521484L6.71387 17.1348L12.7568 0.608887C10.8748 0.866699 8.95288 1 7 1C4.83765 1 2.71362 0.836426 0.63916 0.521484Z"
            fill={AppColors.primaryColor}
          />
        </Svg>
      </Animated.View>
    </MarkerView>
  );
};

/*
<svg width="17" height="23" viewBox="0 0 17 23" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.5 23L0.272758 0.5L16.7272 0.5L8.5 23Z" fill="#FF4F2C"/>
</svg>

 */
const styles = StyleSheet.create({
  wayPointContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  userNameContainer: {
    borderRadius: 10,
    padding: 8,
    margin: 4,
    backgroundColor: AppColors.white,
    ...AppStyles.shadow
  },
  userNameText: {
    color: AppColors.black,
    fontSize: 12,
    fontWeight: "bold"
  },
  userPictureContainer: {
    padding: 2,
    borderColor: AppColors.primaryColor,
    borderWidth: 2
  }
});
