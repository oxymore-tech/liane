import { TimeInMilliseconds, TimeInSeconds } from "./util";
import { FeatureCollection } from "geojson";
import { IUnion, UnionUtils } from "./union";
import { CoLiane } from "./services";

export type Identity = {
  id?: string;
};

export type Entity = Identity & {
  createdBy?: Ref<User>;
  createdAt?: UTCDateTime;
};

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Ref<T extends Identity> = string;

export type AuthUser = {
  id: string;
  isAdmin: boolean;
  isSignedUp: boolean;
};

export type AuthResponse = {
  user: AuthUser;
  token: {
    accessToken: string;
    refreshToken: string;
  };
};

export type AuthRequest = {
  phone: string;
  code: string;
  pushToken?: string;
  withRefresh?: boolean;
};

export type UserInfo = { firstName: string; lastName: string; gender: "Man" | "Woman" | "Unspecified"; pictureUrl?: string };

export type User = {
  pseudo: string;
  pictureUrl: string | undefined | null;
  gender: "Man" | "Woman" | "Unspecified";
  stats: { totalTrips: number; totalAvoidedEmissions: number; totalCreatedTrips: number; totalJoinedTrips: number } | null;
} & Entity;

export type FullUser = {
  phone: string;
  firstName: string;
  lastName: string;
  pushToken?: string;
} & User;

export type LatLng = {
  lat: number;
  lng: number;
};

export const RallyingPointLocationTypes = [
  "Parking",
  "CarpoolArea",
  "Supermarket",
  "HighwayExit",
  "RelayParking",
  "AbandonedRoad",
  "AutoStop",
  "TownHall",
  "TrainStation",
  "RoadSide"
] as const;

export type LocationType = (typeof RallyingPointLocationTypes)[number];

export type RallyingPoint = Identity & {
  location: LatLng;
  label: string;
  type: LocationType;
  address: string;
  zipCode: string;
  city: string;
  placeCount?: number;
  isActive: boolean;
};

export type RallyingPointRequest = { point: Omit<Omit<RallyingPoint, "isActive">, "id">; comment: string } & Entity;

export type DayBoolean = "0" | "1";

export enum DayOfWeek {
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
  Friday = "Friday",
  Saturday = "Saturday",
  Sunday = "Sunday"
}

export class DayOfWeekUtils {
  static from(day: number): DayOfWeek {
    switch (day) {
      case 0:
        return DayOfWeek.Sunday;
      case 1:
        return DayOfWeek.Monday;
      case 2:
        return DayOfWeek.Tuesday;
      case 3:
        return DayOfWeek.Wednesday;
      case 4:
        return DayOfWeek.Thursday;
      case 5:
        return DayOfWeek.Friday;
      case 6:
        return DayOfWeek.Saturday;
      default:
        throw new Error("Invalid day of week");
    }
  }
}

export type DayOfWeekFlag = `${DayBoolean}${DayBoolean}${DayBoolean}${DayBoolean}${DayBoolean}${DayBoolean}${DayBoolean}`; // First index is Monday

export type LianeRequest = Identity & {
  liane: Ref<CoLiane>;
  arriveAt: UTCDateTime;
  returnAt?: UTCDateTime;
  availableSeats: number;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
};

export type Trip = Entity & {
  liane: Ref<CoLiane>;
  departureTime: UTCDateTime;
  return?: Ref<Trip>;
  wayPoints: WayPoint[];
  members: LianeMember[];
  driver: { user: Ref<User>; canDrive: boolean };
  state: TripStatus;
};

export type TripStatus = "NotStarted" | "Finished" | "Started" | "Canceled" | "Archived";
export type GeolocationLevel = "None" | "Hidden" | "Shared";
export type WayPoint = {
  rallyingPoint: RallyingPoint;
  duration: TimeInSeconds;
  distance: number;
  eta: UTCDateTime;
  effectiveTime?: UTCDateTime;
};

export type LianeMember = {
  user: User;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seatCount: number;
  geolocationLevel: GeolocationLevel;
  cancellation?: UTCDateTime;
  departure?: UTCDateTime;
};

// A date time in ISO 8601 format
export type UTCDateTime = string;

export type Feedback = {
  comment: string | null;
  canceled: boolean;
};

export type LianeUpdate = {
  departureTime: UTCDateTime;
};

export type LianeMatchDisplay = { features: FeatureCollection; lianeMatches: LianeMatch[] };

export type PaginatedResponse<T> = {
  pageSize: number;
  data: T[];
  next?: string;
  totalCount?: number | null;
};

export type PaginatedRequestParams = {
  cursor?: string;
  limit: number;
  asc?: boolean;
};

export type TargetTimeDirection = "Departure" | "Arrival";

export type LianeSearchFilter = {
  to: Ref<RallyingPoint>;
  from: Ref<RallyingPoint>;
  targetTime: {
    dateTime: UTCDateTime;
    direction: TargetTimeDirection;
  };
  //TODO withReturnTrip?: boolean;
  availableSeats: number;
};

export type Exact = { pickup: Ref<RallyingPoint>; deposit: Ref<RallyingPoint> } & IUnion<"Exact">;
export type Compatible = {
  pickup: Ref<RallyingPoint>;
  deposit: Ref<RallyingPoint>;
  wayPoints: WayPoint[];
  // deltaInSeconds: number;

  delta: {
    totalInSeconds: number;
    totalInMeters: number;
    pickupInSeconds: number;
    pickupInMeters: number;
    depositInSeconds: number;
    depositInMeters: number;
  };
} & IUnion<"Compatible">;
export type Match = Exact | Compatible;

export type LianeMatch = {
  trip: Trip;
  match: Match;
  returnTime?: UTCDateTime;
  freeSeatsCount: number;
};

export const getPoint = (match: LianeMatch, type: "pickup" | "deposit"): RallyingPoint => {
  const wp = UnionUtils.isInstanceOf(match.match, "Exact") ? match.trip.wayPoints : match.match.wayPoints;
  return wp.find(p => p.rallyingPoint.id === match.match[type])!.rallyingPoint;
};

export type TrackedMemberLocation = {
  member: Ref<User>;
  liane: Ref<Trip>;
  at: UTCDateTime;
  nextPoint: Ref<RallyingPoint>;
  delay: TimeInMilliseconds;
  location?: LatLng;
  isMoving: boolean;
};
export type Car = {
  at: UTCDateTime;
  nextPoint: Ref<RallyingPoint>;
  delay: TimeInMilliseconds;
  position: LatLng;
  members: Ref<User>[];
  isMoving: boolean;
};

export type TrackingInfo = {
  liane: Ref<Trip>;
  car?: Car;
  otherMembers: { [id: string]: TrackedMemberLocation };
};
