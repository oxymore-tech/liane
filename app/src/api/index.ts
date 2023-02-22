import { TimeInSeconds } from "@/util/datetime";
export type Identity = Readonly<{
  id?: string;
}>;

export type Entity = Identity &
  Readonly<{
    createdBy?: Ref<User>;
    createdAt?: UTCDateTime;
  }>;

export type Ref<T extends Identity> = string | T;

export type AuthUser = Readonly<{
  id: string;
  phone: string;
  isAdmin: boolean;
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

export type User = Readonly<
  {
    phone: string;
    pseudo: string;
  } & Entity
>;

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
    returnTime?: UTCDateTime;
    availableSeats: number;
    from: Ref<RallyingPoint>;
    to: Ref<RallyingPoint>;
    // shareWith: Ref<User>[];
  }>;

export type Liane = Identity &
  Readonly<{
    createdBy?: Ref<User>;
    createdAt?: UTCDateTime;
    departureTime: UTCDateTime;
    returnTime?: UTCDateTime;
    wayPoints: WayPoint[];
    members: LianeMember[];
    driver?: Ref<User>;
  }>;

export type WayPoint = Readonly<{
  rallyingPoint: RallyingPoint;
  duration: TimeInSeconds;
}>;

export type LianeMember = Readonly<{
  user: Ref<User>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seatCount: number;
}>;

// A date time in ISO 8601 format
export type UTCDateTime = string;

// A time in ISO 8601 format
export type UTCTimeOnly = string;

export type TripIntent = Readonly<
  {
    from: Ref<RallyingPoint>;
    to: Ref<RallyingPoint>;
    goTime: UTCTimeOnly;
    returnTime?: UTCTimeOnly;
  } & Entity
>;

export type Match = Readonly<{
  user: Ref<User>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
}>;

export type TripIntentMatch = Readonly<{
  tripIntent: TripIntent;
  from: RallyingPoint;
  to: RallyingPoint;
  matches: Match[];
}>;

export type ChatMessage = Readonly<
  {
    text: string;
  } & Entity
>;

export type ConversationGroup = Readonly<
  {
    members: {
      user: Ref<User>;
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
  nextCursor?: string;
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

export type ExactMatch = { type: "ExactMatch" };
export type CompatibleMatch = { type: "CompatibleMatch"; deltaInSeconds: TimeInSeconds };

export type LianeMatch = Readonly<{
  liane: Ref<Liane>;
  departureTime: UTCDateTime;
  returnTime: UTCDateTime;
  wayPoints: WayPoint[];
  originalTrip: WayPoint[];
  driver: Ref<User>;
  matchData: ExactMatch | CompatibleMatch;
  freeSeatsCount: number;
}>;
