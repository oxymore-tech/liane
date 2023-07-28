import { TimeInSeconds } from "@/util/datetime";
import { FeatureCollection } from "geojson";

export class UnionUtils {
  static isInstanceOf<T extends { type: string }>(notification: { type: string }, type: T["type"]): notification is T {
    return notification.type === type;
  }
}

export type Identity = Readonly<{
  id?: string;
}>;

export type Entity = Identity &
  Readonly<{
    createdBy?: Ref<User>;
    createdAt?: UTCDateTime;
  }>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Ref<T extends Identity> = string;

export type WithResolvedRef<Key extends string, TRef extends Identity, T extends { [k in Key]: Ref<TRef> }> = Omit<T, Key> & { [k in Key]: TRef };

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
}>;

export type UserInfo = Readonly<{ firstName: string; lastName: string; gender: "Man" | "Woman" | "Unspecified"; pictureUrl?: string }>;

export type User = Readonly<
  {
    phone: string;
    pseudo: string;
    pictureUrl: string | undefined | null;
    gender: "Man" | "Woman" | "Unspecified";
  } & Entity
>;

export type FullUser = Readonly<
  {
    pushToken?: string;
  } & User
>;

export type LngLat = [number, number];

export type LatLng = Readonly<{
  lat: number;
  lng: number;
}>;

export enum LocationPermissionLevel {
  NEVER = "never",
  ACTIVE = "active",
  ALWAYS = "always"
}

export enum LocationType {
  Parking = "Parking",
  CarpoolArea = "CarpoolArea",
  Supermarket = "Supermarket",
  HighwayExit = "HighwayExit",
  RelayParking = "RelayParking",
  AbandonedRoad = "AbandonedRoad",
  AutoStop = "AutoStop",
  TownHall = "TownHall"
}

export type RallyingPoint = Identity &
  Readonly<{
    location: LatLng;
    label: string;
    type: LocationType;
    address: string;
    zipCode: string;
    city: string;
    placeCount?: number;
    isActive: boolean;
  }>;

export type LianeRequest = Identity &
  Readonly<{
    departureTime: UTCDateTime;
    returnTime?: UTCDateTime | null;
    availableSeats: number;
    from: Ref<RallyingPoint>;
    to: Ref<RallyingPoint>;
    // shareWith: Ref<User>[];
  }>;

export type Liane = Entity &
  Readonly<{
    departureTime: UTCDateTime;
    returnTime?: UTCDateTime;
    wayPoints: WayPoint[];
    members: LianeMember[];
    driver: { user: Ref<User>; canDrive: boolean };
    conversation: Ref<ConversationGroup>;
    state: LianeState;
  }>;

export type LianeState = "NotStarted" | "Finished" | "Started" | "Canceled" | "Archived";

export type WayPoint = Readonly<{
  rallyingPoint: RallyingPoint;
  duration: TimeInSeconds;
  distance: number;
  eta: UTCDateTime;
}>;

export type LianeMember = Readonly<{
  user: User;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seatCount: number;
  delay?: TimeInSeconds;
}>;

// A date time in ISO 8601 format
export type UTCDateTime = string;

export type PointDisplay = Readonly<{
  rallyingPoint: RallyingPoint;
  lianes: Liane[];
}>;

export type Feedback = Readonly<{
  comment: string | null;
  canceled: boolean;
}>;
/*
export type LianeSegment = Readonly<{
  coordinates: GeoJSON.Position[];
  lianes: Ref<Liane>[];
}>;

export type LianeDisplay = Readonly<{
  segments: LianeSegment[];
  lianes: Liane[];
}>;
*/

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

export type Route = Readonly<{
  coordinates: LatLng[];
  duration: number;
  distance: number;
  delta?: number;
}>;

export type PaginatedResponse<T> = Readonly<{
  pageSize: number;
  data: T[];
  next?: string;
}>;

export type PaginatedRequestParams = {
  cursor?: string;
  limit: number;
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

export type Exact = { type: "Exact"; pickup: Ref<RallyingPoint>; deposit: Ref<RallyingPoint> };
export type Compatible = {
  type: "Compatible";
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
};
export type Match = Exact | Compatible;

export type LianeMatch = Readonly<{
  liane: Liane;
  //   wayPoints: WayPoint[];
  match: Match;
  freeSeatsCount: number;
}>;

export const getPoint = (match: LianeMatch, type: "pickup" | "deposit"): RallyingPoint => {
  const wp = UnionUtils.isInstanceOf<Exact>(match.match, "Exact") ? match.liane.wayPoints : match.match.wayPoints;
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
    targetLiane: Liane;
    seats: number;
    takeReturnTrip: boolean;
    message: string;
    accepted?: boolean;
    match: Match;
    //wayPoints: WayPoint[];
    createdBy?: User;
    createdAt?: UTCDateTime;
  } & Identity
>;

export type RallyingPointLink = { deposit: RallyingPoint; hours: UTCDateTime[] };
export type NearestLinks = { pickup: RallyingPoint; destinations: RallyingPointLink[] }[];
