import React from "react";

import { StyleSheet, View } from "react-native";
import { DayOfWeekFlag } from "@liane/common";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import { weekDays } from "@/util/hooks/days.ts";

type DisplayDaysProps = {
  days: DayOfWeekFlag;
};

export const DisplayDays = ({ days }: DisplayDaysProps) => {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 45,
        marginTop: 15
      }}>
      {[...days].map((char, position) => (
        <View style={char === "0" ? styles.dayNotSelected : styles.daySelected} key={position}>
          <AppText
            style={{
              fontWeight: "normal",
              fontSize: 18,
              lineHeight: 27,
              color: AppColors.white
            }}>{`${weekDays[position]}`}</AppText>
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
