import React from "react";
import { RallyingPoint, UTCDateTime, WayPoint } from "@/api";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { getTripMatch } from "@/components/trip/trip";

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

  return (
    <WayPointsView
      wayPoints={tripMatch.wayPoints}
      departureTime={tripMatch.departureTime}
      departureIndex={tripMatch.departureIndex}
      arrivalIndex={tripMatch.arrivalIndex}
      showSegmentOnly={!!props.showAsSegment}
    />
  );
};
