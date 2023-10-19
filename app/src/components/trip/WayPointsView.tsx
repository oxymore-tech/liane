import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Column, Row } from "@/components/base/AppLayout";
import { TimeView } from "@/components/TimeView";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { RallyingPoint, Ref, WayPoint } from "@/api";
import { AppIcon } from "@/components/base/AppIcon";
import { addSeconds } from "@/util/datetime";

export interface WayPointsViewProps {
  wayPoints: WayPoint[];
  nextWayPoint?:
    | Readonly<{
        id: Ref<RallyingPoint>;
        delay: number;
      }>
    | undefined;
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

const WayPointView = ({
  wayPoint,
  type,
  isPast = false,
  delay
}: {
  wayPoint: WayPoint;
  type: "pickup" | "deposit" | "step";
  isPast?: boolean;
  delay?: number | undefined;
}) => {
  return (
    <Row style={{ alignItems: "center" }} spacing={8}>
      {type === "step" && (
        <View style={{ backgroundColor: isPast ? AppColorPalettes.gray[500] : AppColors.primaryColor, borderRadius: 16, margin: 5, padding: 4 }} />
      )}
      {type !== "step" && (
        <AppIcon
          name={type === "pickup" ? "pin" : "flag"}
          color={isPast ? AppColorPalettes.gray[500] : AppColors.primaryColor}
          size={18}
          style={{ width: 18 }}
        />
      )}
      {(!delay || isPast) && (
        <TimeView style={[styles.mainWayPointTime, { color: isPast ? AppColorPalettes.gray[400] : AppColors.primaryColor }]} value={wayPoint.eta} />
      )}
      {!!delay && !isPast && (
        <Column>
          <TimeView
            style={[styles.mainWayPointTime, { color: isPast ? AppColorPalettes.gray[400] : AppColors.primaryColor }]}
            value={addSeconds(new Date(wayPoint.eta), delay).toISOString()}
          />
          <View style={{ height: 8 }} />
          <TimeView style={{ position: "absolute", bottom: 0, right: 0, textDecorationLine: "line-through" }} value={wayPoint.eta} />
        </Column>
      )}
      <View style={{ flexGrow: 1, flexShrink: 1 }}>
        <AppText style={[styles.mainWayPointCity]}>{wayPoint.rallyingPoint.city}</AppText>
        <AppText style={[styles.mainWayPointLabel]}>{wayPoint.rallyingPoint.label}</AppText>
      </View>
    </Row>
  );
};

export const WayPointsView = ({ wayPoints, nextWayPoint }: WayPointsViewProps) => {
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
  const nextWayPointIndex = nextWayPoint ? wayPoints.findIndex(w => w.rallyingPoint.id === nextWayPoint.id) : undefined;
  return (
    <Column style={{ flexGrow: 1, flexShrink: 1 }}>
      <WayPointView wayPoint={from} type={"pickup"} isPast={!!nextWayPointIndex && nextWayPointIndex > 0} delay={nextWayPoint?.delay} />
      {steps.map((s, i) => (
        <WayPointView
          wayPoint={s}
          type={"step"}
          key={s.rallyingPoint.id}
          delay={nextWayPoint?.delay}
          isPast={!!nextWayPointIndex && nextWayPointIndex > i + 1}
        />
      ))}
      <WayPointView wayPoint={to} type={"deposit"} delay={nextWayPoint?.delay} />
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
