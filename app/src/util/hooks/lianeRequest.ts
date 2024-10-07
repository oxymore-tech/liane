import { DayOfWeekFlag, RallyingPoint, TimeOnly, WayPoint } from "@liane/common";
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

export function extractDaysTimes(request: { weekDays: DayOfWeekFlag; arriveBefore: TimeOnly; returnAfter: TimeOnly }): string {
  const daysReccurence = extractDays(request.weekDays);
  return `${daysReccurence} ${request.arriveBefore.hour}h${request.arriveBefore.minute} -> ${request.returnAfter.hour}h${request.returnAfter.minute}`.trim();
}

export function extractDaysOnly(request: { weekDays: DayOfWeekFlag; arriveBefore: TimeOnly; returnAfter: TimeOnly }): string {
  const daysReccurence = extractDays(request.weekDays);
  return `${daysReccurence}`.trim();
}
