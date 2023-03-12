import React from "react";
import { RallyingPoint, UTCDateTime, WayPoint } from "@/api";
import { DetailedWayPointView, WayPointsView } from "@/components/trip/WayPointsView";

export interface LianeMatchViewProps {
  to: RallyingPoint;

  from: RallyingPoint;

  departureTime: UTCDateTime;

  originalTrip: WayPoint[];

  newTrip: WayPoint[];

  showAll?: boolean;
}

export const LianeDetailedMatchView = ({ to, from, originalTrip, departureTime, newTrip }: LianeMatchViewProps) => {
  const departureIndex = newTrip.findIndex(w => w.rallyingPoint.id === from.id);
  const arrivalIndex = newTrip.findIndex(w => w.rallyingPoint.id === to.id);
  const originalIds = originalTrip.map(w => w.rallyingPoint.id);
  const fromIsNewPoint = !originalIds.includes(from.id);
  let showFrom = departureIndex;
  if (fromIsNewPoint && departureIndex > 0) {
    showFrom -= 1;
  }

  return (
    <DetailedWayPointView
      wayPoints={newTrip.slice(showFrom, arrivalIndex + 1)}
      departureTime={departureTime}
      departureIndex={departureIndex}
      arrivalIndex={arrivalIndex}
    />
  );
};
export const LianeMatchView = ({ to, from, originalTrip, departureTime, newTrip }: LianeMatchViewProps) => {
  // For now only show segment from 1 point before departure to arrival
  const departureIndex = newTrip.findIndex(w => w.rallyingPoint.id === from.id);
  const arrivalIndex = newTrip.findIndex(w => w.rallyingPoint.id === to.id);
  const originalIds = originalTrip.map(w => w.rallyingPoint.id);
  const fromIsNewPoint = !originalIds.includes(from.id);
  // const toIsNewPoint = !originalIds.includes(filter.to.id);

  // For now, just show one point before departure up to user's arrival point
  let showFrom = departureIndex;
  if (fromIsNewPoint && departureIndex > 0) {
    showFrom -= 1;
  }
  let showTo = arrivalIndex;
  /*if (toIsNewPoint && arrivalIndex < match.wayPoints.length - 1) {
    showTo += 1;
  }*/

  console.log(departureTime, departureIndex, arrivalIndex, showFrom, showTo);
  return (
    <WayPointsView
      wayPoints={newTrip.slice(showFrom, showTo + 1)}
      departureTime={departureTime}
      departureIndex={departureIndex}
      arrivalIndex={arrivalIndex}
    />
  );
};
