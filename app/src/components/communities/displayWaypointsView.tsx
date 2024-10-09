import React, { ReactNode, useContext, useMemo } from "react";

import { Pressable, StyleSheet, View } from "react-native";
import { CoLianeMatch, DayOfWeekFlag, Hours, Minutes, RallyingPoint, TimeOnly, WayPoint } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView";
import { AppLogger } from "@/api/logger";
import { extractDaysOnly, extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { DetachedLianeItem } from "@/components/communities/DetachedLianeItem.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppIcon, IconName } from "@/components/base/AppIcon.tsx";
import App from "@/App.tsx";

type DisplayDaysProps = {
  wayPoints: RallyingPoint[];
  inverseTravel?: boolean;
  startTime?: TimeOnly;
  endTime?: TimeOnly;
};

export const DisplayWayPoints = ({ wayPoints, inverseTravel = false, startTime, endTime }: DisplayDaysProps) => {
  const { to, from, steps } = inverseTravel ? extractWaypointFromTo(wayPoints.slice().reverse()) : extractWaypointFromTo(wayPoints);

  const travelRow = (step: RallyingPoint, time?: TimeOnly, icon?: string): ReactNode => {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
          width: "100%",
          marginTop: 15,
          marginBottom: 15
        }}>
        {time ? (
          <AppText
            style={{
              fontWeight: "bold",
              fontSize: 20,
              lineHeight: 27,
              color: AppColors.primaryColor,
              marginLeft: 20
            }}>
            {`${formatHour(time.hour)}:${formatHour(time.minute)}`}
          </AppText>
        ) : null}
        {icon ? <AppIcon style={styles.separateIcon} name={icon as IconName} /> : <AppText style={styles.separateNoIcon}>{"|"}</AppText>}
        <View style={{ flexDirection: "column", justifyContent: "center" }}>
          <AppText
            style={{
              fontWeight: "bold",
              fontSize: 20,
              lineHeight: 25,
              color: AppColors.black
            }}>{`${step.city}`}</AppText>
          <AppText
            style={{
              fontWeight: "400",
              fontSize: 20,
              lineHeight: 25,
              color: AppColors.black
            }}>{`${step.label}`}</AppText>
        </View>
      </View>
    );
  };

  return (
    <View
      style={{
        width: "100%",
        marginTop: 15,
        paddingHorizontal: 20
      }}>
      <View
        style={{
          width: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: AppColors.gray100,
          borderRadius: 20
        }}>
        {startTime
          ? travelRow(from, startTime, "position-marker")
          : endTime
          ? travelRow(from, adjustMinutesToTime(endTime, 65, "subtract"), "position-marker")
          : null}
        {steps.map((step, position) => travelRow(step))}
        {endTime
          ? travelRow(to, endTime, "position-end")
          : startTime
          ? travelRow(to, adjustMinutesToTime(startTime, 65, "add"), "position-end")
          : null}
      </View>
    </View>
  );
};

const formatHour = (hour?: number): string => {
  return hour ? (hour < 10 ? "0" + hour : hour.toString()) : "00";
};

function adjustMinutesToTime(time: TimeOnly, minutes: number, operation: "add" | "subtract"): TimeOnly {
  // Récupère l'heure et les minutes existants, en prenant 0 minute si non défini
  let totalMinutes = (time.minute ?? 0) + time.hour * 60;

  // Ajoute ou soustrait les minutes selon l'opération spécifiée
  totalMinutes = operation === "add" ? totalMinutes + minutes : totalMinutes - minutes;

  // Assure que les minutes restent dans une journée complète (1440 minutes = 24h)
  const minutesInDay = 24 * 60;
  totalMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;

  // Calcule la nouvelle heure et les minutes après l'ajustement
  const newHour = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;

  return { hour: newHour as Hours, minute: newMinutes as Minutes };
}

const styles = StyleSheet.create({
  separateIcon: {
    fontWeight: "400",
    fontSize: 20,
    lineHeight: 27,
    color: AppColors.primaryColor,
    marginRight: 20,
    marginLeft: 20
  },
  separateNoIcon: {
    fontWeight: "400",
    fontSize: 20,
    lineHeight: 27,
    color: AppColors.primaryColor,
    marginRight: 20,
    marginLeft: 80
  }
});
