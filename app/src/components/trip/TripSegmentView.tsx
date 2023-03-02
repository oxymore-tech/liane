import { RallyingPoint } from "@/api";
import { StyleSheet, View } from "react-native";
import { AppColorPalettes } from "@/theme/colors";
import { TimeInSeconds } from "@/util/datetime";
import { Column, Row } from "@/components/base/AppLayout";
import { TimeView } from "@/components/TimeView";
import React from "react";
import { AppText } from "@/components/base/AppText";

export interface TripSegmentViewProps {
  from: RallyingPoint;
  to: RallyingPoint;
  departureTime: TimeInSeconds;
  arrivalTime: TimeInSeconds;
}

export const TripSegmentView = ({ from, to, departureTime, arrivalTime }: TripSegmentViewProps) => {
  return (
    <Column>
      <Row style={{ justifyContent: "stretch" }}>
        <AppText style={[styles.mainWayPointLabel, styles.fromLabel]}>{from.label}</AppText>
        <View style={styles.line} />
        <AppText style={[styles.mainWayPointLabel, styles.toLabel]}>{to.label}</AppText>
      </Row>
      <Row style={{ justifyContent: "flex-start" }}>
        <TimeView style={styles.mainWayPointTime} value={departureTime} />
        <AppText> - </AppText>
        <TimeView style={styles.mainWayPointTime} value={arrivalTime} />
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
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1
  },
  line: {
    borderColor: AppColorPalettes.gray[400],
    borderBottomWidth: 1,
    flexGrow: 1,
    flexShrink: 2,
    alignSelf: "center"
  },
  mainWayPointTime: {
    fontSize: 16,
    fontWeight: "700",
    alignSelf: "center",
    color: AppColorPalettes.gray[700]
  }
});
