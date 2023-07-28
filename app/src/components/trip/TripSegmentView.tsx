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
      <Row spacing={4} style={{ alignItems: "center" }}>
        <Column spacing={16}>
          <TimeView style={TripViewStyles.mainWayPointTime2} value={departureTime} />
          <TimeView style={TripViewStyles.mainWayPointTime2} value={arrivalTime} />
        </Column>
        <Column style={{ justifyContent: "space-between", alignSelf: "stretch" }}>
          <View
            style={{
              backgroundColor: AppColorPalettes.gray[100],
              //    borderWidth: 1.5,
              borderColor: AppColors.orange,
              borderRadius: 16,
              alignSelf: "center"
            }}>
            <AppIcon name={"pin"} size={18} color={AppColors.orange} />
          </View>
          <View style={[TripViewStyles.verticalLine, { borderColor: AppColorPalettes.gray[300] }]} />
          <View
            style={{
              backgroundColor: AppColorPalettes.gray[100],
              //    borderWidth: 1.5,
              borderColor: AppColors.pink,
              borderRadius: 16,
              alignSelf: "center"
            }}>
            <AppIcon name={"flag"} size={18} color={AppColors.pink} />
          </View>
        </Column>
        <Column spacing={16}>
          <AppText style={TripViewStyles.mainWayPointLabel2}>{from.label}</AppText>
          <AppText style={TripViewStyles.mainWayPointLabel2}>{to.label}</AppText>
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
  mainWayPointTime2: {
    fontSize: 15,
    fontWeight: "700",
    textAlignVertical: "center",
    alignSelf: "center"
  },
  mainWayPointLabel: {
    fontSize: 15,
    fontWeight: "700",
    textAlignVertical: "center",
    alignSelf: "center",
    flexShrink: 1,
    maxWidth: "60%"
  },
  mainWayPointLabel2: {
    fontSize: 15,
    fontWeight: "500",
    textAlignVertical: "center",
    flexShrink: 1
  },
  horizontalLine: {
    borderColor: AppColorPalettes.gray[400],
    borderTopWidth: 1,
    flexGrow: 1,
    flexShrink: 2,
    alignSelf: "center",
    minWidth: 32
  },
  verticalLine: {
    borderColor: AppColorPalettes.gray[400],
    borderLeftWidth: 1,
    flexGrow: 1,
    flexShrink: 2,
    alignSelf: "center",
    minHeight: 8
  },
  mainWayPointTime: {
    fontSize: 13,
    fontWeight: "700",
    alignSelf: "center",
    color: AppColorPalettes.gray[700]
  }
});
