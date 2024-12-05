import { Pressable } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors.ts";
import { AppText } from "@/components/base/AppText.tsx";
import { getLianeStatusStyle } from "@/components/trip/TripStatusView.tsx";
import React from "react";
import { Trip, User } from "@liane/common";

type TripActionsProps = {
  trip: Trip;
  user: User;
  onQuit: (trip: Trip) => void;
  onJoin: (trip: Trip) => void;
};

export function TripAction({ trip, onQuit, onJoin, user }: TripActionsProps) {
  if (trip) {
    if (trip.state === "NotStarted") {
      return trip.members.some(member => member.user.id === user?.id) ? (
        <Pressable
          onPress={() => onQuit(trip)}
          style={{
            backgroundColor: AppColors.white,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: AppColorPalettes.gray[400]
          }}>
          <AppText
            style={{
              fontSize: 17,
              fontWeight: "normal",
              flexShrink: 1,
              lineHeight: 27,
              color: AppColors.black
            }}>
            {"Quitter"}
          </AppText>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => onJoin(trip)}
          style={{ backgroundColor: AppColors.primaryColor, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 }}>
          <AppText
            style={{
              fontSize: 17,
              fontWeight: "normal",
              flexShrink: 1,
              lineHeight: 27,
              color: AppColors.white
            }}>
            {"Rejoindre"}
          </AppText>
        </Pressable>
      );
    } else {
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
            }
          ]}>
          <AppText
            style={{
              fontSize: 17,
              fontWeight: "normal",
              flexShrink: 1,
              lineHeight: 27
            }}>
            {getLianeStatusStyle(trip.state)[0]}
          </AppText>
        </AppText>
      );
    }
  }
  return null;
}
