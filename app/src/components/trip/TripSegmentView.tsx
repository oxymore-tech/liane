import { RallyingPoint, UTCDateTime } from "@/api";
import { StyleSheet, View } from "react-native";
import { AppColorPalettes } from "@/theme/colors";
import { TimeInSeconds, toTimeInSeconds } from "@/util/datetime";
import { Column, Row } from "@/components/base/AppLayout";
import { TimeView } from "@/components/TimeView";
import React from "react";
import { AppText } from "@/components/base/AppText";
import { AppIcon } from "@/components/base/AppIcon";

export interface TripSegmentViewProps {
  from: RallyingPoint;
  to: RallyingPoint;
  departureTime: UTCDateTime;
  duration: TimeInSeconds;
  freeSeatsCount: number;
}

export const TripSegmentView = ({ from, to, departureTime, duration, freeSeatsCount }: TripSegmentViewProps) => {
  const startTime = toTimeInSeconds(new Date(departureTime));
  return (
    <Column spacing={4}>
      <Row spacing={4}>
        <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.fromLabel]}>{from.city}</AppText>
        <View style={TripViewStyles.line} />
        <AppText style={[TripViewStyles.mainWayPointLabel, TripViewStyles.toLabel]}>{to.city}</AppText>
      </Row>
      <Row style={{ justifyContent: "space-between" }}>
        <Row style={{ justifyContent: "flex-start" }}>
          <TimeView style={TripViewStyles.mainWayPointTime} value={startTime} />
          <AppText> - </AppText>
          <TimeView style={TripViewStyles.mainWayPointTime} value={startTime + duration} />
        </Row>
        <Row style={{ alignItems: "center" }}>
          <AppText style={{ fontSize: 14 }}>{Math.abs(freeSeatsCount)}</AppText>
          <AppIcon size={16} name={"people-outline"} />
        </Row>
      </Row>
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
  mainWayPointLabel: {
    fontSize: 14,
    fontWeight: "700",
    textAlignVertical: "center",
    alignSelf: "center",
    flexShrink: 1,
    maxWidth: "60%"
  },
  line: {
    borderColor: AppColorPalettes.gray[400],
    borderTopWidth: 1,
    flexGrow: 1,
    flexShrink: 2,
    alignSelf: "center",
    minWidth: 32
  },
  mainWayPointTime: {
    fontSize: 12,
    fontWeight: "700",
    alignSelf: "center",
    color: AppColorPalettes.gray[700]
  }
});
