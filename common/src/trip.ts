import { addSeconds, Trip, LianeMatch, TripMember, TripStatus, RallyingPoint, Ref, UnionUtils, User, UTCDateTime, WayPoint } from ".";

export type UserTrip = {
  wayPoints: WayPoint[];
  departureTime: UTCDateTime;
};

export function getTotalDuration(trip: WayPoint[]) {
  return trip.map(w => w.duration).reduce((d, acc) => d + acc, 0);
}

export function getTotalDistance(trip: WayPoint[]) {
  return trip.map(w => w.distance).reduce((d, acc) => d + acc, 0);
}

export function getMemberTrip(liane: Trip, member: TripMember) {
  return getUserTrip(liane, member.user.id!);
}

export function getTripCostContribution(liane: Trip) {
  const totalDistance = getTotalDistance(liane.wayPoints) / 1000;
  const baseKmPrice = 0.3;
  const cost = Math.trunc(totalDistance * baseKmPrice);
  const byMembers = Object.fromEntries(
    liane.members.map(m => {
      const memberTrip = getMemberTrip(liane, m);
      const memberDistance = getTotalDistance(memberTrip.wayPoints) / 1000;
      const memberRatio = memberDistance / totalDistance;
      return [m.user.id!, Math.ceil(memberRatio * cost)];
    })
  );
  const effectiveTotal = Object.values(byMembers).reduce((acc, v) => acc + v, 0);
  const priceDiscountRatio = effectiveTotal / cost;
  const byMembersWithDiscount = Object.fromEntries(
    Object.entries(byMembers).map(([userId, price]) => [userId, Math.trunc(price / priceDiscountRatio)])
  );
  const total = Object.entries(byMembersWithDiscount)
    .filter(([userId, _]) => userId !== liane.driver.user)
    .map(([_, price]) => price)
    .reduce((acc, v) => acc + v, 0);
  const total_cost = Object.entries(byMembersWithDiscount)
    .map(([_, price]) => price)
    .reduce((acc, v) => acc + v, 0);
  return { cost: total_cost, total: Math.trunc(total), byMembers: byMembersWithDiscount };
}

export function getUserTrip(liane: Trip, user: Ref<User>) {
  const member = liane.members.find(m => m.user.id === user);
  return getTrip(liane.departureTime, liane.wayPoints, member?.to, member?.from);
}

export function getTripFromMatch(liane: LianeMatch) {
  const wayPoints = UnionUtils.isInstanceOf(liane.match, "Exact") ? liane.trip.wayPoints : liane.match.wayPoints;
  const departureIndex = wayPoints.findIndex(p => p.rallyingPoint.id === liane.match.pickup);
  const arrivalIndex = wayPoints.findIndex(p => p.rallyingPoint.id === liane.match.deposit);
  return <UserTripMatch>{
    wayPoints: wayPoints.slice(departureIndex, arrivalIndex + 1),
    departureTime: wayPoints[departureIndex].eta,
    departureIndex,
    arrivalIndex
  };
}

export function getTrip(departureTime: UTCDateTime, wayPoints: WayPoint[], to?: string, from?: string) {
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
  newWayPoints[0] = { ...newWayPoints[0], duration: 0, distance: 0 };
  return <UserTrip>{
    wayPoints: newWayPoints,
    departureTime: addSeconds(departure, dStart).toISOString()
  };
}

export type UserTripMatch = {
  departureIndex: number;
  arrivalIndex: number;
} & UserTrip;

export function getTripMatch(to: RallyingPoint, from: RallyingPoint, originalTrip: WayPoint[], departureTime: UTCDateTime, newTrip: WayPoint[]) {
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
}

export type LiveTripStatus = TripStatus | "StartingSoon";

function getTimeForUser(liane: Trip, tripMember: TripMember, type: "to" | "from"): [Date, number] {
  const pointId = tripMember[type];
  const time = new Date(liane.wayPoints.find(w => w.rallyingPoint.id === pointId)!.eta);
  // @ts-ignore
  const delta = (time - new Date()) / 1000;
  return [time, delta];
}

export type LiveUpdateTripStatus = { status: LiveTripStatus; nextUpdateMillis?: number };

export function getLiveTripStatus(trip: Trip, tripMember: TripMember): LiveUpdateTripStatus {
  if (trip.state === "NotStarted") {
    const [, delta] = getTimeForUser(trip, tripMember, "from");
    if (delta <= 24 * 60 * 60 && delta > -1 * 2 * 60 * 60) {
      return { status: "StartingSoon", nextUpdateMillis: delta * 1000 };
    }
    return { status: trip.state };
  }

  if (trip.state !== "Started") {
    return { status: trip.state };
  }

  if (tripMember.arrival) {
    return { status: "Finished" };
  }

  if (tripMember.archiving) {
    return { status: "Archived" };
  }

  if (tripMember.cancellation) {
    return { status: "Canceled" };
  }

  if (tripMember.departure) {
    return { status: "Started" };
  }

  return { status: trip.state };
}
