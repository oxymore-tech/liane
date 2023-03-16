import { Liane, RallyingPoint, User, UTCDateTime, WayPoint } from "@/api";
import { addSeconds } from "@/util/datetime";

export type UserTrip = {
  wayPoints: WayPoint[];
  departureTime: UTCDateTime;
};
export const getTrip = (liane: Liane, user: User) => {
  const member = liane.members.find(m => m.user === user!.id);
  let departureIndex = 0;
  let arrivalIndex = liane.wayPoints.length - 1;
  if (member) {
    departureIndex = liane.wayPoints.findIndex(w => w.rallyingPoint.id === member.from);
    arrivalIndex = liane.wayPoints.findIndex(w => w.rallyingPoint.id === member.to);
  }
  const dStart = liane.wayPoints[departureIndex].duration;
  const departure = new Date(liane.departureTime);
  return <UserTrip>{
    wayPoints: liane.wayPoints.slice(departureIndex, arrivalIndex + 1).map(v => ({ ...v, duration: v.duration - dStart })),
    departureTime: addSeconds(departure, dStart).toISOString()
  };
};

export type UserTripMatch = {
  departureIndex: number;

  arrivalIndex: number;
} & UserTrip;

export const getTripMatch = (to: RallyingPoint, from: RallyingPoint, originalTrip: WayPoint[], departureTime: UTCDateTime, newTrip: WayPoint[]) => {
  // For now only show segment from 1 point before departure to arrival
  const departureIndex = newTrip.findIndex(w => w.rallyingPoint.id === from.id);
  const arrivalIndex = newTrip.findIndex(w => w.rallyingPoint.id === to.id);
  const originalIds = originalTrip.map(w => w.rallyingPoint.id);
  const fromIsNewPoint = !originalIds.includes(from.id);
  const toIsNewPoint = !originalIds.includes(to.id);

  // For now, just show one point before departure up to user's arrival point
  let showFrom = departureIndex;
  if (fromIsNewPoint && departureIndex > 0) {
    showFrom -= 1;
  }
  let showTo = arrivalIndex;
  if (toIsNewPoint && arrivalIndex < newTrip.length - 1) {
    showTo += 1;
  }

  return <UserTripMatch>{
    wayPoints: newTrip.slice(showFrom, showTo + 1),
    departureTime,
    departureIndex,
    arrivalIndex
  };
};
