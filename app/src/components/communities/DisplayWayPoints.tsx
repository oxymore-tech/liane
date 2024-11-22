import React from "react";

import { StyleSheet, View } from "react-native";
import { RallyingPoint, TimeOnly, TimeOnlyUtils, WayPoint } from "@liane/common";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppIcon, IconName } from "@/components/base/AppIcon.tsx";

type DisplayWayPointsProps = {
  wayPoints: WayPoint[];
  style?: object;
  hideLabel?: boolean;
  inverse?: boolean;
};

export const DisplayWayPoints = ({ wayPoints, hideLabel, style, inverse = false }: DisplayWayPointsProps) => {
  if (wayPoints.length === 0) {
    return null;
  }

  const steps = inverse ? wayPoints.slice().reverse() : wayPoints;

  return (
    <View style={style}>
      {steps.map((s, i) => {
        const icon = i === 0 ? "pin" : i === steps.length - 1 ? "flag-outline" : undefined;
        const time = TimeOnlyUtils.fromDate(new Date(s.eta));
        return <TripRow key={s.rallyingPoint.id} point={s.rallyingPoint} time={time} icon={icon} hideLabel={hideLabel} />;
      })}
    </View>
  );
};

type TripProps = { point: RallyingPoint; time?: TimeOnly; icon?: IconName; hideLabel?: boolean };

const TripRow = ({ point, time, icon, hideLabel }: TripProps) => {
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
          <View style={{ backgroundColor: AppColors.primaryColor, borderRadius: 16, margin: 5, padding: 4, marginHorizontal: 8 }} />
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
          ]}>{`${point.city}`}</AppText>
        {hideLabel ? null : (
          <AppText
            style={{
              fontWeight: "normal",
              fontSize: 17,
              lineHeight: 25,
              color: AppColorPalettes.gray[600]
            }}>{`${point.label}`}</AppText>
        )}
      </View>
    </View>
  );
};

const formatHour = (hour?: number): string => {
  return hour ? (hour < 10 ? "0" + hour : hour.toString()) : "00";
};

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
