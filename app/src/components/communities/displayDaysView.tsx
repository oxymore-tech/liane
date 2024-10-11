import React, { useContext, useMemo } from "react";

import { Pressable, StyleSheet, View } from "react-native";
import { CoLianeMatch, DayOfWeekFlag } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView";
import { AppLogger } from "@/api/logger";
import { extractDaysOnly, extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { DetachedLianeItem } from "@/components/communities/DetachedLianeItem.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import App from "@/App.tsx";

type DisplayDaysProps = {
  days: DayOfWeekFlag;
};

export const DisplayDays = ({ days }: DisplayDaysProps) => {
  const DaysOfWeek: { [key: number]: string } = {
    0: "Lu", // Lundi
    1: "Ma", // Mardi
    2: "Me", // Mercredi
    3: "Je", // Jeudi
    4: "Ve", // Vendredi
    5: "Sa", // Samedi
    6: "Di" // Dimanche
  };

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 45,
        marginTop: 25
      }}>
      {[...days].map((char, position) => (
        <View style={char === "0" ? styles.dayNotSelected : styles.daySelected}>
          <AppText
            style={{
              fontWeight: "normal",
              fontSize: 18,
              lineHeight: 27,
              color: AppColors.white
            }}>{`${DaysOfWeek[position]}`}</AppText>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  daySelected: {
    backgroundColor: AppColors.primaryColor,
    borderRadius: 90,
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 3
  },
  dayNotSelected: {
    backgroundColor: AppColors.grayBackground,
    borderRadius: 90,
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 3
  }
});
