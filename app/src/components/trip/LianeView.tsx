import React, { useContext } from "react";
import { Liane, Ref, User } from "@/api";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { AppContext } from "@/components/ContextProvider";
import { addSeconds } from "@/util/datetime";

export interface LianeViewProps {
  liane: Liane;
}

export const LianeView = ({ liane }: LianeViewProps) => {
  const { user } = useContext(AppContext);
  const member = liane.members.find(m => m.user === user!.id);
  let departureIndex = 0;
  let arrivalIndex = liane.wayPoints.length - 1;
  if (member) {
    departureIndex = liane.wayPoints.findIndex(w => w.rallyingPoint.id === member.from);
    arrivalIndex = liane.wayPoints.findIndex(w => w.rallyingPoint.id === member.to);
  }
  const dStart = liane.wayPoints[departureIndex].duration;
  const departure = new Date(liane.departureTime);
  return (
    <WayPointsView wayPoints={liane.wayPoints.slice(departureIndex, arrivalIndex + 1)} departureTime={addSeconds(departure, dStart).toISOString()} />
  );
};
