import { Liane, LianeState, RallyingPoint, User, UTCDateTime, WayPoint } from "@/api";
import { addSeconds } from "@/util/datetime";
import { ColorValue } from "react-native";
import { AppColorPalettes, ContextualColors } from "@/theme/colors";

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

export const getLianeStatus = (liane: Liane): LianeStatus => {
  // @ts-ignore
  const delta = (new Date(liane.departureTime) - new Date()) / 1000;
  //console.debug(liane.state, liane.members.length);

  if (liane.state === "NotStarted") {
    if (delta > 0 && delta < 3600) {
      if (liane.members.length > 1) {
        return "StartingSoon";
      }
    } else if (delta <= 0) {
      return "Started";
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

export const getLianeStatusStyle = (liane: Liane): [string | undefined, ColorValue] => {
  const lianeStatus = getLianeStatus(liane);
  let status;
  let color: ColorValue = AppColorPalettes.gray[100];
  switch (lianeStatus) {
    case "StartingSoon":
      status = "Départ imminent";
      color = AppColorPalettes.yellow[100];
      break;
    case "Started":
      status = "En cours";
      color = ContextualColors.greenValid.light;
      break;
    case "Finished":
      status = "Terminé";
      color = AppColorPalettes.blue[100];
      break;
    case "Canceled":
      status = "Annulé";
      color = ContextualColors.redAlert.light;
      break;
    case "AwaitingDriver":
      status = "Sans conducteur";
      color = ContextualColors.redAlert.light;
      break;
    case "AwaitingPassengers":
      status = "En attente de passagers";
      color = AppColorPalettes.gray[100];
      break;
    case "Archived":
      status = "Archivé";
      color = AppColorPalettes.gray[100];
      break;
  }
  return [status, color];
};
