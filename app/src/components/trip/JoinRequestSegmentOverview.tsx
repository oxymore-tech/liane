import React from "react";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { RallyingPoint, UTCDateTime, WayPoint } from "@/api";
export interface JoinRequestSegmentOverviewProps {
  from: RallyingPoint;

  to: RallyingPoint;

  departureTime: UTCDateTime;
}

export const JoinRequestSegmentOverview = ({ from, to, departureTime }: JoinRequestSegmentOverviewProps) => {
  const wayPoints: WayPoint[] = [
    { rallyingPoint: from, duration: NaN },
    { rallyingPoint: to, duration: NaN }
  ];
  return <WayPointsView wayPoints={wayPoints} departureTime={departureTime} />;
};
