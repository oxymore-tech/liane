import React from "react";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { addSeconds } from "@/util/datetime";
import { isExactMatch, JoinLianeRequestDetailed } from "@/api";
export interface JoinRequestSegmentOverviewProps {
  request: JoinLianeRequestDetailed;
}

export const JoinRequestSegmentOverview = ({ request }: JoinRequestSegmentOverviewProps) => {
  const wayPoints = isExactMatch(request.match) ? request.targetLiane.wayPoints : request.match.pickupPoints[0].wayPoints;
  const departureIndex = wayPoints.findIndex(w => w.rallyingPoint.id === request.from.id);
  const arrivalIndex = wayPoints.findIndex(w => w.rallyingPoint.id === request.to.id);
  const dStart = wayPoints[departureIndex].duration;
  const departure = new Date(request.targetLiane.departureTime);

  return <WayPointsView wayPoints={wayPoints.slice(departureIndex, arrivalIndex + 1)} departureTime={addSeconds(departure, dStart).toISOString()} />;
};
