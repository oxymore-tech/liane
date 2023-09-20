import { RallyingPoint, UTCDateTime } from "@/api";
import { StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { TimeInSeconds } from "@/util/datetime";
import { Column, Row } from "@/components/base/AppLayout";
import { TimeView } from "@/components/TimeView";
import React from "react";
import { AppText } from "@/components/base/AppText";
import { AppIcon } from "@/components/base/AppIcon";
import { RecentTrip } from "@/screens/ItinerarySearchForm";

export interface TripSegmentViewProps {
  from: RallyingPoint;
  to: RallyingPoint;
  departureTime: UTCDateTime;
  arrivalTime: UTCDateTime;
}

export const TripSegmentView = ({ from, to, departureTime, arrivalTime }: TripSegmentViewProps) => {
  return (
    <Column spacing={4}>
      <Row spacing={8} style={{ alignItems: "center" }}>
        <Column style={{ justifyContent: "space-between", alignSelf: "stretch" }}>
          <TimeView style={TripViewStyles.mainWayPointTime} value={departureTime} />
          <TimeView style={TripViewStyles.mainWayPointTime} value={arrivalTime} />
        </Column>
        <Column style={{ justifyContent: "space-between", alignSelf: "stretch", paddingVertical: 8 }}>
          <AppIcon name={"pin"} size={22} color={AppColors.primaryColor} />
          <View style={TripViewStyles.verticalLine} />
          <AppIcon name={"flag"} size={22} color={AppColors.primaryColor} />
        </Column>
        <Column spacing={16}>
          <View>
            <AppText style={TripViewStyles.mainWayPointCity}>{from.city}</AppText>
            <AppText style={TripViewStyles.mainWayPointLabel}>{from.label}</AppText>
          </View>
          <View>
            <AppText style={TripViewStyles.mainWayPointCity}>{to.city}</AppText>
            <AppText style={TripViewStyles.mainWayPointLabel}>{to.label}</AppText>
          </View>
        </Column>
      </Row>

      {/*<Row spacing={4}>
        <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.fromLabel]}>{from.city}</AppText>
        <View style={TripViewStyles.line} />
        <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.toLabel]}>{to.city}</AppText>
      </Row>

      <Row style={{ justifyContent: "space-between" }}>
        <Row style={{ justifyContent: "flex-start" }}>
          <TimeView style={TripViewStyles.mainWayPointTime} value={departureTime} />
          <AppText> - </AppText>
          <TimeView style={TripViewStyles.mainWayPointTime} value={arrivalTime} />
        </Row>
        <Row style={{ alignItems: "center" }}>
          <AppText style={{ fontSize: 14 }}>{Math.abs(freeSeatsCount)}</AppText>
          <AppIcon size={16} name={"people-outline"} />
        </Row>
      </Row>*/}
    </Column>
  );
};

export const TripViewStyles = StyleSheet.create({
  toLabel: {
    color: AppColorPalettes.pink[500]
  },
  grayedLabel: {
    color: AppColorPalettes.gray[500]
  },
  fromLabel: {
    color: AppColorPalettes.orange[500]
  },
  mainWayPointCity: {
    fontSize: 18,
    fontWeight: "bold",
    flexShrink: 1
  },
  mainWayPointLabel: {
    marginTop: -4,
    fontSize: 14,
    fontWeight: "bold",
    flexShrink: 1,
    color: AppColorPalettes.gray[400]
  },
  mainWayPointTime: {
    fontSize: 16,
    fontWeight: "bold",
    alignSelf: "center",
    paddingVertical: 8,
    color: AppColors.primaryColor
  },
  intermediateWayPointLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: AppColorPalettes.gray[700]
  },
  intermediateFromWayPointLabelColor: {
    color: AppColorPalettes.orange[500]
  },
  iconTravel: {
    paddingVertical: 6,
    marginHorizontal: 4
  },
  alignCenter: {
    alignSelf: "center",
    textAlignVertical: "center"
  },
  shrink: {
    flexShrink: 1
  },
  column: {
    justifyContent: "space-between"
  },
  waypointLine: {
    borderLeftColor: AppColorPalettes.gray[400],
    borderLeftWidth: 1,
    minHeight: 12,
    alignSelf: "center",
    position: "relative",
    top: -2
  },
  horizontalLine: {
    marginVertical: 4,
    borderLeftColor: AppColorPalettes.gray[200],
    borderLeftWidth: 1,
    minHeight: 18,
    alignSelf: "center"
  },
  mainWayPointTime2: {
    fontSize: 15,
    fontWeight: "700",
    textAlignVertical: "center",
    alignSelf: "center"
  },
  mainWayPointLabel2: {
    fontSize: 15,
    fontWeight: "500",
    textAlignVertical: "center",
    flexShrink: 1
  },
  verticalLine: {
    borderColor: AppColorPalettes.gray[200],
    borderLeftWidth: 1,
    flexGrow: 1,
    flexShrink: 2,
    alignSelf: "center",
    minHeight: 8,
    marginVertical: 4
  }
});
