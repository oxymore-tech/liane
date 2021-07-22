import React, { memo } from "react";
import { LianeUsage, RoutedLiane } from "@/api";
import { Polyline, Popup } from "react-leaflet";

interface LianeProps {
  liane: RoutedLiane,
  maxUsages: number
}

const MemoPolyline = memo(Polyline);
const MAX_WEIGHT = 4;

function isPrimary(liane: RoutedLiane): boolean {
  return liane.usages.filter((u: LianeUsage) => u.isPrimary).length > 0;
}

function getWeight(liane: RoutedLiane, maxUsages: number): number {
  return MAX_WEIGHT * (maxUsages / liane.usages.length);
}

function getColor(liane: RoutedLiane, maxUsages: number): string {
  const percentage = maxUsages / liane.usages.length;
  let color: string;

  if (percentage <= 0.2) {
    color = "#F1916F";
  } else if (percentage > 0.2 && percentage <= 0.4) {
    color = "#EA6031";
  } else if (percentage > 0.4 && percentage <= 0.6) {
    color = "#e75019";
  } else if (percentage > 0.6 && percentage <= 0.8) {
    color = "#d54c1a";
  } else if (percentage > 0.8 && percentage <= 1) {
    color = "#ba431a";
  } else {
    color = "#d900ff"; // Default case that should not append
  }

  return color;
}

export function LianeRoute({ liane, maxUsages }: LianeProps) {
  if (isPrimary(liane)) {
    return (
      <MemoPolyline
        smoothFactor={2.0}
        positions={liane.route.coordinates}
        color={getColor(liane, maxUsages)}
        weight={getWeight(liane, maxUsages)}
      >
        <Popup closeButton={false}>
          Fréquence:
          {" "}
          {liane.usages.length}
        </Popup>
      </MemoPolyline>
    );
  }

  return (<></>);
}
