import React, { useContext } from "react";
import { Liane } from "@/api";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { AppContext } from "@/components/ContextProvider";
import { getTripFromLiane } from "@/components/trip/trip";

export interface LianeViewProps {
  liane: Liane;
}

export const LianeView = ({ liane }: LianeViewProps) => {
  const { user } = useContext(AppContext);
  return <WayPointsView {...getTripFromLiane(liane, user!)} />;
};
