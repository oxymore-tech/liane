import { CoLianeRequest, RallyingPoint, ResolvedLianeRequest, WayPoint } from "@liane/common";
import { extractDays } from "@/util/hooks/days";
import { useMemo } from "react";

export const extractWaypointFromTo = (wayPoints: WayPoint[] | RallyingPoint[]) => {
  //console.debug("extract data", JSON.stringify(wayPoints), departureTime);
  const from = wayPoints[0];
  const to = wayPoints[wayPoints.length - 1];
  const steps = wayPoints.slice(1, -1);

  return {
    from,
    to,
    steps
  };
};

export const extractDaysTimes = (request: ResolvedLianeRequest | CoLianeRequest): string => {
  const daysReccurence = extractDays(request.weekDays);
  const timeConstraint = request.timeConstraints?.[0]?.when?.start;

  const localeTime = timeConstraint ? `${timeConstraint.hour}h${timeConstraint.minute}` : "";

  return `${daysReccurence} ${localeTime}`.trim();
};
