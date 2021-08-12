import React, { memo, useEffect, useState } from "react";
import { RoutedLiane } from "@/api";
import { Polyline, Popup } from "react-leaflet";

interface LianeProps {
  liane: RoutedLiane,
  onOpen: () => void,
  onClose: () => void,
  maxUsages: number
}

const MemoPolyline = memo(Polyline);
const MAX_WEIGHT = 8;
const MIN_WEIGHT = 4;

function getWeight(liane: RoutedLiane, maxUsages: number): number {
  return Math.max(MAX_WEIGHT * (liane.numberOfUsages / maxUsages), MIN_WEIGHT);
}

function getColor(liane: RoutedLiane, maxUsages: number): string {
  const percentage = liane.numberOfUsages / maxUsages;
  let color: string;

  if (percentage <= 0.2) {
    color = "#F1916F";
  } else if (percentage > 0.2 && percentage <= 0.4) {
    color = "#EA6031";
  } else if (percentage > 0.4 && percentage <= 0.6) {
    color = "#e75019";
  } else if (percentage > 0.6 && percentage <= 0.8) {
    color = "#d54c1a";
  } else if (percentage > 0.8) {
    color = "#ba431a";
  } else {
    color = "#d900ff"; // Default case that should not append
  }

  return color;
}

function getUsage(numberUsages: number): string {
  let usage: string = "Basse";

  if (numberUsages > 100) {
    usage = "Très élevée";
  } else if (numberUsages > 50) {
    usage = "Elevée";
  } else if (numberUsages > 15) {
    usage = "Moyenne";
  }

  return usage;
}

export function LianeRoute({ liane, onOpen, onClose, maxUsages }: LianeProps) {
  const [color, setColor] = useState<string>(getColor(liane, maxUsages));
  const [weight, setWeight] = useState<number>(getWeight(liane, maxUsages));

  useEffect(() => {
    setColor(getColor(liane, maxUsages));
    setWeight(getWeight(liane, maxUsages));
  }, [maxUsages]);

  return (
    <MemoPolyline
      smoothFactor={2.0}
      positions={liane.route.coordinates}
      color={color}
      weight={weight}
      eventHandlers={{
        popupopen: onOpen,
        popupclose: onClose
      }}
    >
      <Popup closeButton={false}>
        <p>
          {liane.from.label}
          {" "}
          -
          {" "}
          {liane.to.label}
        </p>
        <p>
          Utilisation :
          {" "}
          <span className="font-bold">{getUsage(liane.numberOfUsages)}</span>
        </p>
      </Popup>
    </MemoPolyline>
  );
}
