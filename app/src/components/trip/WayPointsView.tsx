import React, { useMemo } from "react";
import { ColorValue, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Column, Row } from "@/components/base/AppLayout";
import { TimeView } from "@/components/TimeView";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { UTCDateTime, WayPoint } from "@/api";
import { toTimeInSeconds } from "@/util/datetime";

export interface WayPointsViewProps {
  departureTime: UTCDateTime;
  wayPoints: WayPoint[];
  departureIndex?: number;
  arrivalIndex?: number;
}

const NewLianeSymbol = ({ color }: { color: ColorValue }) => (
  <View style={{ marginTop: 4 }}>
    <Svg height={20} width="100%" viewBox="-32 0 71 27" fill="none">
      <Path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M0.235368 1.29877C0.246704 0.806898 0.255773 0.370289 0.255773 0H6.65633C6.65633 0.549906 6.64952 1.10534 6.64499 1.66077C6.60191 5.88593 6.55657 10.194 9.0007 13.5874C11.624 17.2322 18.2399 20.9793 35.46 18.2851L36.2739 26.0225C18.648 28.7803 9.05738 25.5002 4.18725 18.7327C-0.0208359 12.8772 0.146943 5.27523 0.235368 1.29877Z"
        fill={color}
      />
      <Path d="M22.9064 12.2613V4.57953H24.4348V12.2613H22.9064ZM19.8325 9.1818V7.65339H27.5143V9.1818H19.8325Z" fill={color} />
    </Svg>
    <View style={styles.waypointLine} />
  </View>
);

const LianeSymbol = ({ color }: { color: ColorValue }) => (
  <View style={{ marginTop: 4 }}>
    <Svg height={20} width="100%" viewBox="-32 0 71 27" fill="none">
      <Path
        fill={color}
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M0.177571 1.29877C0.188885 0.806898 0.197937 0.370289 0.197937 0H6.58628C6.58628 0.549906 6.57949 1.10534 6.57496 1.66077C6.53197 5.88593 6.48671 10.194 8.92618 13.5874C11.5444 17.2322 18.1477 20.9793 35.3349 18.2851L36.1473 26.0225C18.5551 28.7803 8.98275 25.5002 4.12191 18.7327C-0.0781441 12.8772 0.0893152 5.27523 0.177571 1.29877Z"
      />
    </Svg>
    <View style={styles.waypointLine} />
  </View>
);

type TimedWayPoint = {
  wayPoint: WayPoint;
  time: number;
};

// TODO share state with detail view
const extractData = (wayPoints: WayPoint[], departureTime: UTCDateTime) => {
  const from = wayPoints[0];
  const to = wayPoints[wayPoints.length - 1];
  const steps = wayPoints.slice(1, -1);
  const fromDate = new Date(departureTime);
  const fromTime = toTimeInSeconds(fromDate);
  const stepsTimes = steps.map(
    (
      acc => val =>
        acc + val.duration
    )(fromTime)
  );
  const toTime = (steps.length > 0 ? stepsTimes[steps.length - 1] : fromTime) + to.duration;

  return {
    from: {
      wayPoint: from,
      time: fromTime
    },
    to: {
      wayPoint: to,
      time: toTime
    },
    steps: steps.map((v, index) => ({ wayPoint: v, time: stepsTimes[index] }))
  };
};

export const WayPointsView = ({ wayPoints, departureTime, departureIndex, arrivalIndex }: WayPointsViewProps) => {
  if (departureIndex === undefined) {
    departureIndex = 0;
  }
  if (arrivalIndex === undefined) {
    arrivalIndex = wayPoints.length - 1;
  }

  const { to, from, steps } = useMemo(() => extractData(wayPoints, departureTime), [wayPoints, departureTime]);

  const lianeSymbolView = (index: number) =>
    index + 1 === departureIndex ? <NewLianeSymbol color={AppColors.orange} /> : <LianeSymbol color={AppColorPalettes.gray[500]} />;

  const intermediateWayPoint = (index: number) => {
    const wayPoint = steps[index];
    return (
      <AppText
        style={[
          { paddingVertical: 7 },
          styles.intermediateWayPointLabel,
          index + 1 === departureIndex ? styles.intermediateFromWayPointLabelColor : {}
        ]}>
        <TimeView
          style={[styles.intermediateWayPointLabel, index + 1 === departureIndex ? styles.intermediateFromWayPointLabelColor : {}]}
          value={wayPoint.time}
        />{" "}
        - {wayPoint.wayPoint.rallyingPoint.label}
      </AppText>
    );
  };

  return (
    <Row spacing={12}>
      <Column style={styles.column}>
        <TimeView style={styles.mainWayPointTime} value={from.time} />
        <>
          {steps.length === 0 && <View style={styles.line} />}
          {steps.length <= 3 && steps.map((_, i) => lianeSymbolView(i))}
          {steps.length > 3 && [
            lianeSymbolView(0),
            <AppText style={[styles.alignCenter, styles.intermediateWayPointLabel]}>...</AppText>,
            lianeSymbolView(steps.length - 1)
          ]}
        </>
        <TimeView style={styles.mainWayPointTime} value={to.time} />
      </Column>

      <Column style={[styles.column, styles.shrink]}>
        <AppText style={[styles.mainWayPointLabel, departureIndex === 0 ? styles.fromLabel : styles.overallFromLabel]}>
          {from.wayPoint.rallyingPoint.label}
        </AppText>

        {steps.length <= 3 && steps.map((_, i) => intermediateWayPoint(i))}
        {steps.length > 3 && [intermediateWayPoint(0), <AppText>{steps.length - 2} étapes</AppText>, intermediateWayPoint(steps.length - 1)]}

        <AppText style={[styles.mainWayPointLabel, styles.toLabel]}>{to.wayPoint.rallyingPoint.label}</AppText>
      </Column>
    </Row>
  );
};

const styles = StyleSheet.create({
  toLabel: {
    color: AppColorPalettes.pink[500]
  },
  overallFromLabel: {
    color: AppColorPalettes.gray[500]
  },
  fromLabel: {
    color: AppColorPalettes.orange[500]
  },
  mainWayPointLabel: {
    fontSize: 18,
    fontWeight: "700",
    flexShrink: 1
  },
  mainWayPointTime: {
    fontSize: 16,
    fontWeight: "700",
    alignSelf: "center",
    paddingTop: 2,
    color: AppColorPalettes.gray[700]
  },
  intermediateWayPointLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: AppColorPalettes.gray[700]
  },
  intermediateFromWayPointLabelColor: {
    color: AppColorPalettes.orange[500]
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

  line: {
    borderLeftColor: AppColorPalettes.gray[400],
    borderLeftWidth: 1,
    minHeight: 18,
    alignSelf: "center"
  }
});