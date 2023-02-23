import React from "react";
import { LianeMatch } from "@/api";
import { WayPointsView } from "@/components/trip/WayPointsView";
import { InternalLianeSearchFilter } from "@/util/ref";

export interface LianeMatchViewProps {
  match: LianeMatch;
  filter: InternalLianeSearchFilter;
}

export const LianeMatchView = ({ match, filter }: LianeMatchViewProps) => {
  // TODO here filter's ref are resolved
  // For now only show segment from 1 point before departure to arrival
  const departureIndex = match.wayPoints.findIndex(w => w.rallyingPoint.id === filter.from.id);
  const arrivalIndex = match.wayPoints.findIndex(w => w.rallyingPoint.id === filter.to.id);
  const originalIds = match.originalTrip.map(w => w.rallyingPoint.id);
  const fromIsNewPoint = !originalIds.includes(filter.from.id);
  // const toIsNewPoint = !originalIds.includes(filter.to.id);

  let showFrom = departureIndex;
  if (fromIsNewPoint && departureIndex > 0) {
    showFrom -= 1;
  }
  let showTo = arrivalIndex;
  /*if (toIsNewPoint && arrivalIndex < match.wayPoints.length - 1) {
    showTo += 1;
  }*/

  return (
    <WayPointsView
      wayPoints={match.wayPoints.slice(showFrom, showTo + 1)}
      departureTime={match.departureTime}
      departureIndex={departureIndex}
      arrivalIndex={arrivalIndex}
    />
  );
};
