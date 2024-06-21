import {
  addSeconds,
  JoinLianeRequestDetailed,
  Liane,
  LianeMatch,
  LianeMember,
  LianeState,
  RallyingPoint,
  Ref,
  UnionUtils,
  User,
  UTCDateTime,
  WayPoint
} from ".";

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

export function getMemberTrip(liane: Liane, member: LianeMember) {
  return getUserTrip(liane, member.user.id!);
}

export function getTripCostContribution(liane: Liane) {
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

export function getUserTrip(liane: Liane, user: Ref<User>) {
  const member = liane.members.find(m => m.user.id === user);
  return getTrip(liane.departureTime, liane.wayPoints, member?.to, member?.from);
}

export function getTripFromJoinRequest(request: JoinLianeRequestDetailed) {
  const wayPoints = UnionUtils.isInstanceOf(request.match, "Exact") ? request.targetTrip.wayPoints : request.match.wayPoints;
  const departureIndex = wayPoints.findIndex(w => w.rallyingPoint.id === request.from.id);
  const arrivalIndex = wayPoints.findIndex(w => w.rallyingPoint.id === request.to.id);
  const departureTime = wayPoints[departureIndex].eta;
  return { wayPoints: wayPoints.slice(departureIndex, arrivalIndex + 1), departureTime };
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

export type TripStatus = LianeState | "StartingSoon" | "AwaitingPassengers" | "AwaitingDriver";

function getTimeForUser(liane: Liane, user: Ref<User>, type: "to" | "from"): [Date, number] {
  const pointId = liane.members.find(m => m.user.id === user)![type];
  const time = new Date(liane.wayPoints.find(w => w.rallyingPoint.id === pointId)!.eta);
  // @ts-ignore
  const delta = (time - new Date()) / 1000;
  return [time, delta];
}

export function getTripStatus(liane: Liane, user: Ref<User>): { status: TripStatus; nextUpdateMillis?: number | undefined } {
  if (liane.state === "NotStarted") {
    const [, delta] = getTimeForUser(liane, user, "from");

    if (delta > 0 && delta <= 120 * 60) {
      if (liane.members.length > 1) {
        return { status: "StartingSoon", nextUpdateMillis: delta * 1000 };
      }
    } else if (delta <= 0) {
      const [, deltaArrival] = getTimeForUser(liane, user, "to");
      if (deltaArrival <= 0) {
        return { status: "Started" };
      } else {
        return { status: "Started", nextUpdateMillis: deltaArrival * 1000 };
      }
    }
    if (liane.members.length < 2) {
      if (liane.driver.canDrive) {
        return { status: "AwaitingPassengers" };
      } else {
        return { status: "AwaitingDriver" };
      }
    }
  }
  return { status: liane.state };
}
