import {
  addSeconds,
  JoinRequestDetailed,
  Trip,
  LianeMatch,
  TripState,
  RallyingPoint,
  Ref,
  UnionUtils,
  User,
  UTCDateTime,
  WayPoint
} from "@liane/common";
import { useContext, useEffect, useState } from "react";
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
export const getUserTrip = (trip: Trip, user: Ref<User>) => {
  const member = trip.members.find(m => m.user.id === user);
  return getTrip(trip.departureTime, trip.wayPoints, member?.to, member?.from);
};
export const getTripFromJoinRequest = (request: JoinRequestDetailed) => {
  const wayPoints = UnionUtils.isInstanceOf(request.match, "Exact") ? request.targetTrip.wayPoints : request.match.wayPoints;
  const departureIndex = wayPoints.findIndex(w => w.rallyingPoint.id === request.from.id);
  const arrivalIndex = wayPoints.findIndex(w => w.rallyingPoint.id === request.to.id);
  const departureTime = wayPoints[departureIndex].eta;
  return { wayPoints: wayPoints.slice(departureIndex, arrivalIndex + 1), departureTime };
};

export const getTripFromMatch = (liane: LianeMatch) => {
  const wayPoints = UnionUtils.isInstanceOf(liane.match, "Exact") ? liane.trip.wayPoints : liane.match.wayPoints;
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

export type TripStatus = TripState | "StartingSoon" | "AwaitingPassengers" | "AwaitingDriver";

const getTripStatus = (trip: Trip, user: Ref<User>): { status: TripStatus; nextUpdateMillis?: number | undefined } => {
  if (trip.state === "NotStarted") {
    const [, delta] = getTimeForUser(trip, user, "from");

    if (delta > 0 && delta <= 120 * 60) {
      if (trip.members.length > 1) {
        return { status: "StartingSoon", nextUpdateMillis: delta * 1000 };
      }
    } else if (delta <= 0) {
      const [, deltaArrival] = getTimeForUser(trip, user, "to");
      if (deltaArrival <= 0) {
        return { status: "Started" };
      } else {
        return { status: "Started", nextUpdateMillis: deltaArrival * 1000 };
      }
    }
    if (trip.members.length < 2) {
      if (trip.driver.canDrive) {
        return { status: "AwaitingPassengers" };
      } else {
        return { status: "AwaitingDriver" };
      }
    }
  }
  return { status: trip.state };
};
const getTimeForUser = (trip: Trip, user: Ref<User>, type: "to" | "from"): [Date, number] => {
  const pointId = trip.members.find(m => m.user.id === user)![type];
  const time = new Date(trip.wayPoints.find(w => w.rallyingPoint.id === pointId)!.eta);
  // @ts-ignore
  const delta = (time - new Date()) / 1000;
  return [time, delta];
};

export const useTripStatus = (trip: Trip | undefined): TripStatus | undefined => {
  const { user } = useContext(AppContext);
  const userId = user!.id!;

  const [status, setStatus] = useState(trip ? getTripStatus(trip, userId) : undefined);

  useEffect(() => {
    if (!trip) {
      return;
    }
    setStatus(getTripStatus(trip, userId));
  }, [trip, userId]);
  useEffect(() => {
    if (trip && status?.nextUpdateMillis !== undefined) {
      const timeout = setTimeout(() => {
        setStatus(getTripStatus(trip, userId));
      }, status.nextUpdateMillis);
      return () => clearTimeout(timeout);
    }
  }, [status?.nextUpdateMillis, trip, userId]);

  return status?.status;
};
