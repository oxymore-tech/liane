import React from "react";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { addSeconds } from "@/util/datetime";
import { JoinLianeRequestDetailed } from "@/api";
export interface JoinRequestSegmentOverviewProps {
  request: JoinLianeRequestDetailed;
}

export const JoinRequestSegmentOverview = ({ request }: JoinRequestSegmentOverviewProps) => {
  const departureIndex = request.wayPoints.findIndex(w => w.rallyingPoint.id === request.from.id);
  const arrivalIndex = request.wayPoints.findIndex(w => w.rallyingPoint.id === request.to.id);
  const dStart = request.wayPoints[departureIndex].duration;
  const departure = new Date(request.targetLiane.departureTime);

  return (
    <WayPointsView
      wayPoints={request.wayPoints.slice(departureIndex, arrivalIndex + 1)}
      departureTime={addSeconds(departure, dStart).toISOString()}
    />
  );
};
