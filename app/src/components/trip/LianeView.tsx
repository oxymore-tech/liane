import React, { useContext } from "react";
import { Liane } from "@liane/common";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { AppContext } from "@/components/context/ContextProvider";
import { getTripFromLiane } from "@/components/trip/trip";

export interface LianeViewProps {
  liane: Liane;
}

export const LianeView = ({ liane }: LianeViewProps) => {
  const { user } = useContext(AppContext);
  return <WayPointsView {...getTripFromLiane(liane, user!.id!)} />;
};
