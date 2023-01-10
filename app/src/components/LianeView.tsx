import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Column, Row } from "@/components/base/AppLayout";
import { TimeView } from "@/components/TimeView";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import { Liane, WayPoint } from "@/api";

export interface LianeViewProps {
  liane : Liane;

}

const LianeSymbol = ({ color }: { color: AppColors }) => (
  <View style={{ marginTop: 4 }}>
    <Svg height={20} width="100%" viewBox="-32 0 71 27" fill="none">
      {/* eslint-disable-next-line max-len */}
      <Path fill={color} fill-rule="evenodd" clip-rule="evenodd" d="M0.177571 1.29877C0.188885 0.806898 0.197937 0.370289 0.197937 0H6.58628C6.58628 0.549906 6.57949 1.10534 6.57496 1.66077C6.53197 5.88593 6.48671 10.194 8.92618 13.5874C11.5444 17.2322 18.1477 20.9793 35.3349 18.2851L36.1473 26.0225C18.5551 28.7803 8.98275 25.5002 4.12191 18.7327C-0.0781441 12.8772 0.0893152 5.27523 0.177571 1.29877Z" />
    </Svg>
    <View style={styles.waypointLine} />
  </View>
);

const IntermediateWayPoint = ({ wayPoint }: { wayPoint: TimedWayPoint }) => (
  <AppText style={[{ paddingVertical: 7 }, styles.intermediateWayPointLabel]}>
    <TimeView style={styles.intermediateWayPointLabel} value={wayPoint.time} />
    {" "}
    -
    {" "}
    {wayPoint.wayPoint.rallyingPoint.label}
  </AppText>
);

type TimedWayPoint = {
  wayPoint: WayPoint,
  time: number
};

// TODO share state with detail view
const extractData = (liane: Liane) => {
  const from = liane.wayPoints[0];
  const to = liane.wayPoints[liane.wayPoints.length - 1];
  const steps = liane.wayPoints.slice(1, -1);
  const fromDate = new Date(liane.departureTime);
  const fromTime = fromDate.getHours() * 3600 + fromDate.getMinutes() * 60 + fromDate.getSeconds();
  const stepsTimes = steps.map(((acc) => (val) => acc + val.duration)(fromTime));
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

export const LianeView = ({ liane }: LianeViewProps) => {
  const { to, from, steps } = useMemo(() => extractData(liane), [liane]);

  const lianeSymbolView = () => (<LianeSymbol color={AppColors.gray500} />);

  return (
    <Row spacing={12}>
      <Column style={styles.column}>
        <TimeView style={styles.mainWayPointTime} value={from.time} />
        {steps.length === 0 && (<View style={styles.line} />) }
        {steps.length <= 3 && steps.map(() => lianeSymbolView())}
        {steps.length > 3 && [lianeSymbolView(), (<AppText style={[styles.alignCenter, styles.intermediateWayPointLabel]}>...</AppText>), lianeSymbolView()]}
        <TimeView style={styles.mainWayPointTime} value={to.time} />
      </Column>

      <Column style={styles.column}>
        <AppText style={[styles.mainWayPointLabel, styles.fromLabel]}>{from.wayPoint.rallyingPoint.label}</AppText>

        {steps.length <= 3 && steps.map((p) => (<IntermediateWayPoint wayPoint={p} />))}
        {steps.length > 3 && [
          (<IntermediateWayPoint wayPoint={steps[0]} />),
          (
            <AppText>
              {steps.length - 2}
              {" "}
              étapes
            </AppText>
          ),
          (<IntermediateWayPoint wayPoint={steps[steps.length - 1]} />)]}

        <AppText style={[styles.mainWayPointLabel, styles.toLabel]}>{to.wayPoint.rallyingPoint.label}</AppText>
      </Column>
    </Row>

  );
};

const styles = StyleSheet.create(
  {
    toLabel: {
      color: AppColors.pink500
    },
    fromLabel: {
      color: AppColors.orange500
    },
    mainWayPointLabel: {
      fontSize: 20,
      fontWeight: "700"
    },
    mainWayPointTime: {
      fontSize: 18,
      fontWeight: "700",
      alignSelf: "center",
      paddingTop: 2,
      color: AppColors.gray700
    },
    intermediateWayPointLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: AppColors.gray700
    },
    alignCenter: {
      alignSelf: "center",
      textAlignVertical: "center"
    },
    column: {
      justifyContent: "space-between"
    },
    waypointLine: {
      borderLeftColor: AppColors.gray400,
      borderLeftWidth: 1,
      minHeight: 12,
      alignSelf: "center",
      position: "relative",
      top: -2
    },

    line: {
      borderLeftColor: AppColors.gray400,
      borderLeftWidth: 1,
      minHeight: 18,
      alignSelf: "center"
    }
  }
);