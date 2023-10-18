import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Column, Row } from "@/components/base/AppLayout";
import { TimeView } from "@/components/TimeView";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { UTCDateTime, WayPoint } from "@/api";
import { AppIcon } from "@/components/base/AppIcon";

export interface WayPointsViewProps {
  departureTime: UTCDateTime;
  wayPoints: WayPoint[];
  departureIndex?: number;
  arrivalIndex?: number;
  showSegmentOnly?: boolean;
}

// TODO share state with detail view
const extractData = (wayPoints: WayPoint[]) => {
  //console.debug("extract data", JSON.stringify(wayPoints), departureTime);
  const from = wayPoints[0];
  const to = wayPoints[wayPoints.length - 1];
  const steps = wayPoints.slice(1, -1);

  return {
    from,
    to,
    steps
  };
};

export const WayPointsView = ({ wayPoints, departureIndex, arrivalIndex, showSegmentOnly = false }: WayPointsViewProps) => {
  if (showSegmentOnly) {
    wayPoints = wayPoints.slice(departureIndex ?? 0, arrivalIndex ?? wayPoints.length);
  }

  const { to, from, steps } = useMemo(() => extractData(wayPoints), [wayPoints]);
  /* Open in map app
 () => showLocation({
              latitude: from.rallyingPoint.location.lat,
              longitude: from!.rallyingPoint.location.lng,
              title: from.rallyingPoint.label,
              dialogTitle: "Se rendre au point de rendez-vous",
              googleForceLatLon: true,
              cancelText: "Annuler",
              appsWhiteList: ["google-maps", "apple-maps", "waze"],
              directionsMode: "walk"
            })
 */
  return (
    <Column style={{ flexGrow: 1, flexShrink: 1 }}>
      <Row style={{ alignItems: "center" }} spacing={8}>
        <AppIcon name={"pin"} color={AppColors.primaryColor} size={18} style={{ width: 18 }} />

        <TimeView style={styles.mainWayPointTime} value={from.eta} />
        <View style={{ flexGrow: 1, flexShrink: 1 }}>
          <AppText style={[styles.mainWayPointCity]}>{from.rallyingPoint.city}</AppText>
          <AppText style={[styles.mainWayPointLabel]}>{from.rallyingPoint.label}</AppText>
        </View>
      </Row>
      {steps.map(s => (
        <Row key={s.rallyingPoint.id} style={{ alignItems: "center" }} spacing={8}>
          <View style={{ backgroundColor: AppColors.primaryColor, borderRadius: 16, margin: 5, padding: 4 }} />

          <TimeView style={styles.mainWayPointTime} value={s.eta} />
          <View style={{ flexGrow: 1, flexShrink: 1 }}>
            <AppText style={[styles.mainWayPointCity]}>{s.rallyingPoint.city}</AppText>
            <AppText style={[styles.mainWayPointLabel]}>{s.rallyingPoint.label}</AppText>
          </View>
        </Row>
      ))}
      <Row style={{ alignItems: "center" }} spacing={8}>
        <AppIcon name={"flag"} color={AppColors.primaryColor} size={18} style={{ width: 18 }} />
        <TimeView style={styles.mainWayPointTime} value={to.eta} />
        <View style={{ flexGrow: 1, flexShrink: 1 }}>
          <AppText style={[styles.mainWayPointCity]}>{to.rallyingPoint.city}</AppText>
          <AppText style={[styles.mainWayPointLabel]}>{to.rallyingPoint.label}</AppText>
        </View>
      </Row>
    </Column>
  );
};

const styles = StyleSheet.create({
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
    paddingTop: 8,
    paddingBottom: 6,
    color: AppColors.primaryColor,
    flexShrink: 0
  },
  intermediateWayPointLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: AppColorPalettes.gray[700]
  },
  intermediateFromWayPointLabelColor: {
    color: AppColors.primaryColor
  },
  iconTravel: {
    paddingTop: 10,
    paddingBottom: 6,
    marginHorizontal: 10
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
  }
});
