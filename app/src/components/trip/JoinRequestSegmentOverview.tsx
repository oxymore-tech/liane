import React from "react";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { JoinRequestDetailed } from "@liane/common";
import { getTripFromJoinRequest } from "@/components/trip/trip";

export interface JoinRequestSegmentOverviewProps {
  request: JoinRequestDetailed;
}

export const JoinRequestSegmentOverview = (props: JoinRequestSegmentOverviewProps) => {
  const { wayPoints } = getTripFromJoinRequest(props.request);
  return <WayPointsView wayPoints={wayPoints} />;
};
