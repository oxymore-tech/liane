import React from "react";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { JoinLianeRequestDetailed } from "@/api";
import { getTripFromJoinRequest } from "@/components/trip/trip";
export interface JoinRequestSegmentOverviewProps {
  request: JoinLianeRequestDetailed;
}

export const JoinRequestSegmentOverview = (props: JoinRequestSegmentOverviewProps) => {
  const { wayPoints } = getTripFromJoinRequest(props.request);
  return <WayPointsView wayPoints={wayPoints} />;
};
