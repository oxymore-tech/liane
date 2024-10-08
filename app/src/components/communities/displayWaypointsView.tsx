import React, { useContext, useMemo } from "react";

import { Pressable, StyleSheet, View } from "react-native";
import { CoLianeMatch, DayOfWeekFlag, RallyingPoint, TimeOnly, WayPoint } from "@liane/common";
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
  wayPoints: RallyingPoint[];
  inverseTravel?: boolean;
  startTime?: TimeOnly;
  endTime?: TimeOnly;
};

export const DisplayWayPoints = ({ wayPoints, inverseTravel = false, startTime, endTime }: DisplayDaysProps) => {
  const { to, from, steps } = inverseTravel ? extractWaypointFromTo(wayPoints.slice().reverse()) : extractWaypointFromTo(wayPoints);

  // TODO: Manque le calcul du temps de trajet. Manque les icones. Découpage en composants.

  const travelRow = (step: RallyingPoint, time: TimeOnly, icon?: string): Element => {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
          width: "100%",
          marginTop: 20
        }}>
        {icon ? (
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
        <AppText style={icon ? styles.separateIcon : styles.separateNoIcon}>{icon ? "-" : "|"}</AppText>
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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "center",
            width: "100%",
            marginTop: 20
          }}>
          <AppText
            style={{
              fontWeight: "bold",
              fontSize: 20,
              lineHeight: 27,
              color: AppColors.primaryColor,
              marginLeft: 20
            }}>
            {startTime
              ? `${formatHour(startTime.hour)}:${formatHour(startTime.minute)}`
              : `${endTime && formatHour(endTime.hour - 1)}:${endTime && formatHour(endTime.minute)}`}
          </AppText>
          <AppText
            style={{
              fontWeight: "400",
              fontSize: 20,
              lineHeight: 27,
              color: AppColors.primaryColor,
              marginHorizontal: 20
            }}>{`-`}</AppText>
          <View style={{ flexDirection: "column", justifyContent: "center" }}>
            <AppText
              style={{
                fontWeight: "bold",
                fontSize: 20,
                lineHeight: 25,
                color: AppColors.black
              }}>{`${from.city}`}</AppText>
            <AppText
              style={{
                fontWeight: "400",
                fontSize: 20,
                lineHeight: 25,
                color: AppColors.black
              }}>{`${from.label}`}</AppText>
          </View>
        </View>
        {steps.map((step, position) => (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-start",
              alignItems: "center",
              width: "100%",
              marginTop: 20
            }}>
            <AppText
              style={{
                fontWeight: "400",
                fontSize: 20,
                lineHeight: 27,
                color: AppColors.lightGrayBackground,
                marginRight: 20,
                marginLeft: 80
              }}>{`|`}</AppText>
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
        ))}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "center",
            width: "100%",
            marginTop: 20,
            marginBottom: 20
          }}>
          <AppText
            style={{
              fontWeight: "bold",
              fontSize: 20,
              lineHeight: 27,
              color: AppColors.primaryColor,
              marginLeft: 20
            }}>
            {endTime
              ? `${formatHour(endTime.hour)}:${formatHour(endTime?.minute)}`
              : `${startTime && formatHour(startTime.hour + 1)}:${startTime && formatHour(startTime.minute)}`}
          </AppText>
          <AppText
            style={{
              fontWeight: "400",
              fontSize: 20,
              lineHeight: 27,
              color: AppColors.primaryColor,
              marginHorizontal: 20
            }}>{`-`}</AppText>
          <View style={{ flexDirection: "column", justifyContent: "center" }}>
            <AppText
              style={{
                fontWeight: "bold",
                fontSize: 20,
                lineHeight: 25,
                color: AppColors.black
              }}>{`${to.city}`}</AppText>
            <AppText
              style={{
                fontWeight: "400",
                fontSize: 20,
                lineHeight: 25,
                color: AppColors.black
              }}>{`${to.label}`}</AppText>
          </View>
        </View>
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
    color: AppColors.lightGrayBackground,
    marginRight: 20,
    marginLeft: 20
  },
  separateNoIcon: {
    fontWeight: "400",
    fontSize: 20,
    lineHeight: 27,
    color: AppColors.lightGrayBackground,
    marginRight: 20,
    marginLeft: 80
  }
});
