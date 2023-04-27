import { Liane, LianeMatch, RallyingPoint, User, UTCDateTime, WayPoint } from "@/api";
import { addSeconds } from "@/util/datetime";

export type UserTrip = {
  wayPoints: WayPoint[];
  departureTime: UTCDateTime;
};

export const getTotalDuration = (trip: WayPoint[]) => {
  return trip.map(w => w.duration).reduce((d, acc) => d + acc, 0);
};
export const getTotalDistance = (trip: WayPoint[]) => {
  return trip.map(w => w.distance).reduce((d, acc) => d + acc, 0);
};
export const getTripFromLiane = (liane: Liane, user: User) => {
  const member = liane.members.find(m => m.user === user!.id);
  return getTrip(liane.departureTime, liane.wayPoints, member?.to, member?.from);
};

export const getTrip = (departureTime: UTCDateTime, wayPoints: WayPoint[], to?: string, from?: string) => {
  let departureIndex = 0;
  let arrivalIndex = wayPoints.length - 1;

  if (from) {
    departureIndex = wayPoints.findIndex(w => w.rallyingPoint.id === from);
  }
  if (to) {
    arrivalIndex = wayPoints.findIndex(w => w.rallyingPoint.id === to);
  }

  const dStart = getTotalDuration(wayPoints.slice(0, departureIndex + 1));
  const departure = new Date(departureTime);
  const newWayPoints = wayPoints.slice(departureIndex, arrivalIndex + 1);
  newWayPoints[0] = { ...newWayPoints[0], duration: 0 };
  return <UserTrip>{
    wayPoints: newWayPoints,
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
