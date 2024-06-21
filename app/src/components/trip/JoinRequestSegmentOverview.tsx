import React from "react";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { getTripFromJoinRequest, JoinLianeRequestDetailed } from "@liane/common";

export interface JoinRequestSegmentOverviewProps {
  request: JoinLianeRequestDetailed;
}

export const JoinRequestSegmentOverview = (props: JoinRequestSegmentOverviewProps) => {
  const { wayPoints } = getTripFromJoinRequest(props.request);
  return <WayPointsView wayPoints={wayPoints} />;
};
