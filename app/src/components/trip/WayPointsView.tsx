import React, { useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Column, Row } from "@/components/base/AppLayout";
import { convertToTimeOnly, TimeView } from "@/components/TimeView";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes } from "@/theme/colors";
import { addSeconds, Car, WayPoint } from "@liane/common";
import { AppIcon } from "@/components/base/AppIcon";
import { AppLocalization } from "@/api/i18n.ts";

export interface WayPointsViewProps {
  style?: StyleProp<ViewStyle>;
  wayPoints: WayPoint[];
  carLocation?: Car;
  dark?: boolean;
}

function extractData(wayPoints: WayPoint[]) {
  const from = wayPoints[0];
  const to = wayPoints[wayPoints.length - 1];
  const steps = wayPoints.slice(1, -1);

  return {
    from,
    to,
    steps
  };
}

type WayPointViewProps = {
  wayPoint: WayPoint;
  type: "pickup" | "deposit" | "step";
  isPast?: boolean;
  delay?: number | undefined;
  dark?: boolean;
};

export const WayPointView = ({ wayPoint, type, isPast = false, delay = 0, dark }: WayPointViewProps) => {
  return (
    <Row style={{ alignItems: "center" }} spacing={8}>
      <View>
        <TimeView
          textStyle={[styles.mainWayPointTime, { color: isPast ? AppColorPalettes.gray[400] : AppColorPalettes.orange[500] }]}
          value={addSeconds(new Date(wayPoint.eta), delay).toISOString()}
        />
        {delay > 0 && (
          <AppText style={{ position: "absolute", bottom: 0, right: 0, textDecorationLine: "line-through", fontSize: 12 }}>
            {AppLocalization.formatTimeOnly(convertToTimeOnly(wayPoint.effectiveTime ?? wayPoint.eta))}
          </AppText>
        )}
      </View>
      {type === "step" && (
        <View
          style={{ backgroundColor: isPast ? AppColorPalettes.gray[500] : AppColorPalettes.orange[500], borderRadius: 16, margin: 5, padding: 4 }}
        />
      )}
      {type !== "step" && (
        <AppIcon
          name={type === "pickup" ? "pin" : "flag"}
          color={isPast ? AppColorPalettes.gray[500] : AppColorPalettes.orange[500]}
          size={18}
          style={{ width: 18 }}
        />
      )}
      <Column>
        <AppText style={[styles.mainWayPointCity, { color: dark ? AppColorPalettes.gray[100] : AppColorPalettes.gray[800] }]}>
          {wayPoint.rallyingPoint.city}
        </AppText>
        <AppText style={[styles.mainWayPointLabel]}>{wayPoint.rallyingPoint.label}</AppText>
      </Column>
    </Row>
  );
};

function computeDelay(carLocation: Car | undefined, wayPoints: WayPoint[]) {
  if (!carLocation) {
    return;
  }
  const nextWayPoint = wayPoints.find(w => w.rallyingPoint.id === carLocation.nextPoint);
  if (!nextWayPoint) {
    return;
  }

  return (new Date(carLocation.at).getTime() + carLocation.delay - new Date(nextWayPoint.eta).getTime()) / 1000;
}

export const WayPointsView = ({ wayPoints, carLocation, dark }: WayPointsViewProps) => {
  const { from, to, steps } = useMemo(() => extractData(wayPoints), [wayPoints]);
  const nextWayPointIndex = carLocation ? wayPoints.findIndex(w => w.rallyingPoint.id === carLocation.nextPoint) : undefined;
  const delay = computeDelay(carLocation, wayPoints);

  if (!from) {
    return null;
  }

  return (
    <Column>
      <WayPointView wayPoint={from} type="pickup" isPast={!!nextWayPointIndex && nextWayPointIndex > 0} delay={delay} dark={dark} />
      {steps.map((s, i) => (
        <WayPointView
          wayPoint={s}
          type="step"
          key={s.rallyingPoint.id}
          delay={delay}
          isPast={!!nextWayPointIndex && nextWayPointIndex > i + 1}
          dark={dark}
        />
      ))}
      <WayPointView wayPoint={to} type="deposit" delay={delay} dark={dark} />
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
    color: AppColorPalettes.orange[500],
    flexShrink: 0
  }
});
