import { DayOfWeekFlag, RallyingPoint, TimeConstraint, WayPoint } from "@liane/common";
import { extractDays } from "@/util/hooks/days";

export function extractWaypointFromTo<T extends WayPoint | RallyingPoint>(wayPoints: T[]) {
  const from = wayPoints[0];
  const to = wayPoints[wayPoints.length - 1];
  const steps = wayPoints.slice(1, -1);

  return {
    from,
    to,
    steps
  };
}

export function extractDaysTimes(request: { weekDays: DayOfWeekFlag; timeConstraints: TimeConstraint[] }): string {
  const daysReccurence = extractDays(request.weekDays);
  const timeConstraint = request.timeConstraints?.[0]?.when?.start;

  const localeTime = timeConstraint ? `${timeConstraint.hour}h${timeConstraint.minute}` : "";

  return `${daysReccurence} ${localeTime}`.trim();
}
