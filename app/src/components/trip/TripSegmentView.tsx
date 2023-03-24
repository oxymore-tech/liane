import { RallyingPoint, UTCDateTime } from "@/api";
import { StyleSheet, View } from "react-native";
import { AppColorPalettes } from "@/theme/colors";
import { TimeInSeconds, toTimeInSeconds } from "@/util/datetime";
import { Column, Row } from "@/components/base/AppLayout";
import { TimeView } from "@/components/TimeView";
import React from "react";
import { AppText } from "@/components/base/AppText";

export interface TripSegmentViewProps {
  from: RallyingPoint;
  to: RallyingPoint;
  departureTime: UTCDateTime;
  duration: TimeInSeconds;
}

export const TripSegmentView = ({ from, to, departureTime, duration }: TripSegmentViewProps) => {
  const startTime = toTimeInSeconds(new Date(departureTime));
  return (
    <Column>
      <Row>
        <AppText style={[styles.mainWayPointLabel, styles.fromLabel]}>{from.city}</AppText>
        <View style={styles.line} />
        <AppText style={[styles.mainWayPointLabel, styles.toLabel]}>{to.city}</AppText>
      </Row>
      <Row style={{ justifyContent: "flex-start" }}>
        <TimeView style={styles.mainWayPointTime} value={startTime} />
        <AppText> - </AppText>
        <TimeView style={styles.mainWayPointTime} value={startTime + duration} />
      </Row>
    </Column>
  );
};

const styles = StyleSheet.create({
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
    flexShrink: 1
  },
  line: {
    borderColor: AppColorPalettes.gray[400],
    borderTopWidth: 1,
    flexGrow: 1,
    flexShrink: 2,
    marginHorizontal: 4,
    alignSelf: "center"
  },
  mainWayPointTime: {
    fontSize: 14,
    fontWeight: "700",
    alignSelf: "center",
    color: AppColorPalettes.gray[700]
  }
});
