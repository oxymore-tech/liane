import { TimeInSeconds } from "./util";
import { FeatureCollection } from "geojson";
import { IUnion, UnionUtils } from "./union";

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

export type AuthUser = Readonly<{
  id: string;
  isAdmin: boolean;
  isSignedUp: boolean;
}>;

export type AuthResponse = Readonly<{
  user: AuthUser;
  token: {
    accessToken: string;
    refreshToken: string;
  };
}>;

export type AuthRequest = Readonly<{
  phone: string;
  code: string;
  pushToken?: string;
  withRefresh?: boolean;
}>;

export type UserInfo = Readonly<{ firstName: string; lastName: string; gender: "Man" | "Woman" | "Unspecified"; pictureUrl?: string }>;

export type User = Readonly<
  {
    phone: string;
    pseudo: string;
    pictureUrl: string | undefined | null;
    gender: "Man" | "Woman" | "Unspecified";
    stats: { totalTrips: number; totalAvoidedEmissions: number; totalCreatedTrips: number; totalJoinedTrips: number } | null;
  } & Entity
>;

export type FullUser = Readonly<
  {
    firstName: string;
    lastName: string;
    pushToken?: string;
  } & User
>;

export type LngLat = [number, number];

export type LatLng = Readonly<{
  lat: number;
  lng: number;
}>;

export const RallyingPointLocationTypes = [
  "Parking",
  "CarpoolArea",
  "Supermarket",
  "HighwayExit",
  "RelayParking",
  "AbandonedRoad",
  "AutoStop",
  "TownHall"
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
export type DayOfWeekFlag = `${DayBoolean}${DayBoolean}${DayBoolean}${DayBoolean}${DayBoolean}${DayBoolean}${DayBoolean}`; // First index is Monday

export type LianeRequest = Identity &
  Readonly<{
    departureTime: UTCDateTime;
    returnTime?: UTCDateTime | null;
    availableSeats: number;
    from: Ref<RallyingPoint>;
    to: Ref<RallyingPoint>;
    recurrence: DayOfWeekFlag | null;
    geolocationLevel: GeolocationLevel;
    // shareWith: Ref<User>[];
  }>;

export type Liane = Entity &
  Readonly<{
    departureTime: UTCDateTime;
    return: Ref<Liane>;
    wayPoints: WayPoint[];
    members: LianeMember[];
    driver: { user: Ref<User>; canDrive: boolean };
    conversation: Ref<ConversationGroup>;
    state: LianeState;
    recurrence?: {
      id: string;
      days: DayOfWeekFlag;
    };
  }>;

export type LianeState = "NotStarted" | "Finished" | "Started" | "Canceled" | "Archived";
export type GeolocationLevel = "None" | "Hidden" | "Shared";
export type WayPoint = Readonly<{
  rallyingPoint: RallyingPoint;
  duration: TimeInSeconds;
  distance: number;
  eta: UTCDateTime;
  effectiveTime?: UTCDateTime;
}>;

export type LianeMember = Readonly<{
  user: User;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seatCount: number;
  geolocationLevel: GeolocationLevel;
  cancellation: UTCDateTime | undefined | null;
  departure: UTCDateTime | undefined | null;
}>;

export type LianeRecurrence = {
  id: string;
  createdBy: Ref<User>;
  createdAt: UTCDateTime;
  days: DayOfWeekFlag;
  initialRequest: {
    to: RallyingPoint;
    from: RallyingPoint;
    departureTime: Date;
    availableSeats: number;
    returnTime: Date | null | undefined;
  };
  active: boolean;
};

// A date time in ISO 8601 format
export type UTCDateTime = string;

export type Feedback = Readonly<{
  comment: string | null;
  canceled: boolean;
}>;

export type LianeUpdate = {
  departureTime: UTCDateTime;
};

export type LianeMatchDisplay = Readonly<{ features: FeatureCollection; lianeMatches: LianeMatch[] }>;
export type ChatMessage = Readonly<
  {
    text: string;
  } & Entity
>;

export type ConversationGroup = Readonly<
  {
    members: {
      user: User;
      joinedAt: UTCDateTime;
      lastReadAt: UTCDateTime;
    }[];
  } & Identity
>;

export type TypedMessage = Readonly<
  {
    type: "proposal";
  } & ChatMessage
>;

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

export type LianeSearchFilter = Readonly<{
  to: Ref<RallyingPoint>;
  from: Ref<RallyingPoint>;
  targetTime: {
    dateTime: UTCDateTime;
    direction: TargetTimeDirection;
  };
  //TODO withReturnTrip?: boolean;
  availableSeats: number;
}>;

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

export type LianeMatch = Readonly<{
  trip: Liane;
  //   wayPoints: WayPoint[];
  match: Match;
  returnTime?: UTCDateTime;
  freeSeatsCount: number;
}>;

export const getPoint = (match: LianeMatch, type: "pickup" | "deposit"): RallyingPoint => {
  const wp = UnionUtils.isInstanceOf(match.match, "Exact") ? match.trip.wayPoints : match.match.wayPoints;
  return wp.find(p => p.rallyingPoint.id === match.match[type])!.rallyingPoint;
};

export type NewConversationMessage = Readonly<{
  conversationId: string;
  sender: User;
  message: ChatMessage;
}>;

export type JoinLianeRequestDetailed = Readonly<
  {
    from: RallyingPoint;
    to: RallyingPoint;
    targetTrip: Liane;
    seats: number;
    takeReturnTrip: boolean;
    message: string;
    accepted?: boolean;
    match: Match;
    createdBy?: User;
    createdAt?: UTCDateTime;
  } & Identity
>;

export type TrackedMemberLocation = {
  member: Ref<User>;
  liane: Ref<Liane>;
  at: UTCDateTime;
  nextPoint: Ref<RallyingPoint>;
  delay: TimeInSeconds;
  location?: LatLng;
  isMoving: boolean;
};
export type Car = {
  at: UTCDateTime;
  nextPoint: Ref<RallyingPoint>;
  delay: number;
  position: LatLng;
  members: Ref<User>[];
  isMoving: boolean;
};

export type TrackingInfo = {
  liane: Ref<Liane>;
  car?: Car;
  otherMembers: { [id: string]: TrackedMemberLocation };
};
