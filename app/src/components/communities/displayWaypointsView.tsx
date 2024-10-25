import React, { ReactNode } from "react";

import { StyleSheet, View } from "react-native";
import { Hours, Minutes, RallyingPoint, TimeOnly, TimeOnlyUtils, WayPoint } from "@liane/common";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { AppIcon, IconName } from "@/components/base/AppIcon.tsx";

type DisplayWayPointsProps = {
  wayPoints: WayPoint[];
  style?: object;
  hideLabel?: boolean;
};

export const DisplayWayPoints = ({ wayPoints, hideLabel, style }: DisplayWayPointsProps) => {
  if (wayPoints.length === 0) {
    return null;
  }

  const startTime = TimeOnlyUtils.fromDate(new Date(wayPoints[0].eta));
  const endTime = TimeOnlyUtils.fromDate(new Date(wayPoints[wayPoints.length - 1].eta));
  return (
    <DisplayRallyingPoints
      wayPoints={wayPoints.map(w => w.rallyingPoint)}
      startTime={startTime}
      endTime={endTime}
      hideLabel={hideLabel}
      style={style}
    />
  );
};

export type DisplayRallyingPointsProps = {
  wayPoints: RallyingPoint[];
  inverseTravel?: boolean;
  startTime?: TimeOnly;
  endTime?: TimeOnly;
  style?: object;
  hideLabel?: boolean;
};

export const DisplayRallyingPoints = ({ wayPoints, inverseTravel = false, startTime, endTime, style, hideLabel }: DisplayRallyingPointsProps) => {
  const { to, from, steps } = inverseTravel ? extractWaypointFromTo(wayPoints.slice().reverse()) : extractWaypointFromTo(wayPoints);

  const tripRow = (step: RallyingPoint, time?: TimeOnly, icon?: string): ReactNode => {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
          width: "100%"
        }}>
        {time ? (
          <AppText
            style={{
              fontWeight: "bold",
              fontSize: 17,
              lineHeight: 27,
              color: AppColors.primaryColor,
              marginLeft: 20
            }}>
            {`${formatHour(time.hour)}:${formatHour(time.minute)}`}
          </AppText>
        ) : null}
        {icon ? (
          <AppIcon style={styles.separateIcon} name={icon as IconName} color={AppColors.primaryColor} />
        ) : (
          <View style={styles.separateIcon}>
            <View style={{ backgroundColor: AppColors.primaryColor, borderRadius: 16, margin: 5, padding: 4 }} />
          </View>
        )}
        <View style={{ flexDirection: "column", justifyContent: "center" }}>
          <AppText
            style={[
              {
                fontSize: 17,
                lineHeight: 25,
                color: AppColors.black
              },
              hideLabel
                ? {
                    fontWeight: "normal"
                  }
                : { fontWeight: "bold" }
            ]}>{`${step.city}`}</AppText>
          {hideLabel ? null : (
            <AppText
              style={{
                fontWeight: "normal",
                fontSize: 17,
                lineHeight: 25,
                color: AppColorPalettes.gray[600]
              }}>{`${step.label}`}</AppText>
          )}
        </View>
      </View>
    );
  };

  return (
    <View
      style={{
        width: "100%"
      }}>
      <View
        style={[
          {
            width: "100%",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 10
          },
          style
        ]}>
        {startTime
          ? tripRow(from, startTime, "pin")
          : endTime
          ? tripRow(from, adjustMinutesToTime(endTime, 65, "subtract"), "position-marker")
          : null}
        {steps.map(step => tripRow(step))}
        {endTime ? tripRow(to, endTime, "flag") : startTime ? tripRow(to, adjustMinutesToTime(startTime, 65, "add"), "position-end") : null}
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
