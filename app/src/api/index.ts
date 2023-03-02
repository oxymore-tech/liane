import { TimeInSeconds } from "@/util/datetime";
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

export type FullUser = Readonly<
  {
    pushToken?: string;
  } & User
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

export type Liane = Entity &
  Readonly<{
    departureTime: UTCDateTime;
    returnTime?: UTCDateTime;
    wayPoints: WayPoint[];
    members: LianeMember[];
    driver?: Ref<User>;
    group: Ref<ConversationGroup>;
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

export type Match = Readonly<{
  user: Ref<User>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
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

export type ExactMatch = { type: "ExactMatch" };
export type CompatibleMatch = { type: "CompatibleMatch"; deltaInSeconds: TimeInSeconds };

export type LianeMatch = Readonly<{
  liane: Liane;
  wayPoints: WayPoint[];
  matchData: ExactMatch | CompatibleMatch;
  freeSeatsCount: number;
}>;

// Notifications
export type Notification<T> = Readonly<
  {
    event: T;
    createdAt: UTCDateTime;
    read: boolean;
    type: string;
  } & Identity
>;

export type NewConversationMessage = Readonly<{
  conversationId: string;
  sender: User;
  message: ChatMessage;
}>;

export type JoinLianeRequest = Readonly<
  {
    from: Ref<RallyingPoint>;
    to: Ref<RallyingPoint>;
    targetLiane: Ref<Liane>;
    seats: number;
    takeReturnTrip: boolean;
    message: string;
    accepted?: boolean;
  } & Entity
>;

export const isJoinLianeRequest = (notification: Notification<any>): notification is Notification<JoinLianeRequest> => {
  return notification.type === "JoinLianeRequest";
};

export type JoinLianeRequestDetailed = Readonly<
  {
    from: RallyingPoint;
    to: RallyingPoint;
    targetLiane: Liane;
    seats: number;
    takeReturnTrip: boolean;
    message: string;
    accepted?: boolean;
    matchType: ExactMatch | CompatibleMatch;
    wayPoints: WayPoint[];
    createdBy?: User;
    createdAt?: UTCDateTime;
  } & Identity
>;
