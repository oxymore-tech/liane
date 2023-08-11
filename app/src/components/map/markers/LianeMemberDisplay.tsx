import { RallyingPoint, User } from "@/api";
import { ColorValue, StyleSheet, Text, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { UserPicture } from "@/components/UserPicture";
import React from "react";
import { MarkerView, useAppMapViewController } from "../AppMapView";
import { AppStyles } from "@/theme/styles";

export const LianeMemberDisplay = ({
  rallyingPoint,
  user,
  active = true,
  size = 56,
  offsetY
}: // showIcon = true
{
  rallyingPoint: RallyingPoint;
  user: User;
  active?: boolean;
  size?: number;
  offsetY?: number;
}) => {
  return (
    <MarkerView id={rallyingPoint.id!} coordinate={[rallyingPoint.location.lng, rallyingPoint.location.lat]}>
      <View pointerEvents="none" style={[styles.wayPointContainer, { top: offsetY }]}>
        {
          <View style={styles.wayPointContainer}>
            <View style={styles.userNameContainer}>
              <Text style={styles.userNameText}>{user.pseudo}</Text>
            </View>
            <View
              style={[
                styles.userPictureContainer,
                { borderRadius: size, width: size, height: size, borderColor: active ? AppColors.orange : AppColorPalettes.gray[400] }
              ]}>
              <UserPicture url={user.pictureUrl} id={user.id} size={size - 8} />
            </View>
          </View>
        }

        <View
          style={{
            padding: 4,
            marginTop: 4,
            marginBottom: size + 40,
            backgroundColor: AppColors.darkBlue,
            borderRadius: 4,
            borderColor: AppColors.white,
            borderWidth: 1,
            opacity: 0
          }}
        />
      </View>
    </MarkerView>
  );
};

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
    fontSize: 14,
    fontWeight: "bold"
  },
  userPictureContainer: {
    padding: 2,
    borderColor: AppColors.orange,
    borderWidth: 2
  }
});
