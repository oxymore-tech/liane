import React from "react";
import { Liane } from "@/api";
import { WayPointsView } from "@/components/trip/WayPointsView";

export interface LianeViewProps {
  liane: Liane;
}

export const LianeView = ({ liane }: LianeViewProps) => {
  return <WayPointsView wayPoints={liane.wayPoints} departureTime={liane.departureTime} />;
};
