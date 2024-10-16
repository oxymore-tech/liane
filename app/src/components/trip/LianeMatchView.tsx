import React from "react";
import { getTripMatch, RallyingPoint, UTCDateTime, WayPoint } from "@liane/common";
import { WayPointsView } from "@/components/trip/WayPointsView";

export interface LianeMatchViewProps {
  to: RallyingPoint;

  from: RallyingPoint;

  departureTime: UTCDateTime;

  originalTrip: WayPoint[];

  newTrip: WayPoint[];

  showAsSegment?: boolean;
}

export const LianeMatchView = (props: LianeMatchViewProps) => {
  // For now only show segment from 1 point before departure to arrival
  const tripMatch = getTripMatch(props.to, props.from, props.originalTrip, props.departureTime, props.newTrip);
  const wayPoints = props.showAsSegment
    ? tripMatch.wayPoints.slice(tripMatch.departureIndex ?? 0, tripMatch.arrivalIndex ?? tripMatch.wayPoints.length)
    : tripMatch.wayPoints;
  return <WayPointsView wayPoints={wayPoints} />;
};
