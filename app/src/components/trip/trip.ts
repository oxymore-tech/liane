import { Exact, Liane, LianeMatch, LianeState, RallyingPoint, Ref, UnionUtils, User, UTCDateTime, WayPoint } from "@/api";
import { addSeconds } from "@/util/datetime";
import { useContext } from "react";
import { AppContext } from "@/components/context/ContextProvider";

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
  const member = liane.members.find(m => m.user.id === user!.id);
  return getTrip(liane.departureTime, liane.wayPoints, member?.to, member?.from);
};

export const getTripFromMatch = (liane: LianeMatch) => {
  const wayPoints = UnionUtils.isInstanceOf<Exact>(liane.match, "Exact") ? liane.liane.wayPoints : liane.match.wayPoints;
  const departureIndex = wayPoints.findIndex(p => p.rallyingPoint.id === liane.match.pickup);
  const arrivalIndex = wayPoints.findIndex(p => p.rallyingPoint.id === liane.match.deposit);
  return <UserTripMatch>{
    wayPoints: wayPoints.slice(departureIndex, arrivalIndex + 1),
    departureTime: wayPoints[departureIndex].eta,
    departureIndex,
    arrivalIndex
  };
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

export type LianeStatus = LianeState | "StartingSoon" | "AwaitingPassengers" | "AwaitingDriver";

const getTimeForUser = (liane: Liane, user: Ref<User>, type: "to" | "from"): [Date, number] => {
  const pointId = liane.members.find(m => m.user.id === user)![type];
  const time = new Date(liane.wayPoints.find(w => w.rallyingPoint.id === pointId)!.eta);
  // @ts-ignore
  const delta = (time - new Date()) / 1000;
  return [time, delta];
};

export const useLianeStatus = (liane: Liane): LianeStatus => {
  const { user } = useContext(AppContext);

  if (liane.state === "NotStarted" || liane.state === "Started") {
    const [_, delta] = getTimeForUser(liane, user!.id!, "from");
    if (delta > 0 && delta < 900) {
      if (liane.members.length > 1) {
        return "StartingSoon";
      }
    } else if (delta <= 0) {
      const [_, deltaArrival] = getTimeForUser(liane, user!.id!, "to");
      if (deltaArrival <= 0) {
        return "Finished";
      } else {
        return "Started";
      }
    }
    if (liane.members.length < 2) {
      if (liane.driver.canDrive) {
        return "AwaitingPassengers";
      } else {
        return "AwaitingDriver";
      }
    }
  }
  return liane.state;
};
