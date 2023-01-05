export type Identity = Readonly<{
  id?: string;
}>;

export type Entity = Readonly<{
  createdBy?: Ref<User>;
  createdAt?: Date;
} & Identity>;

export type Ref<T extends Identity> = string | T;

export type AuthUser = Readonly<{
  id: string;
  phone: string;
  isAdmin: boolean;
}>;

export type AuthResponse = Readonly<{
  user: AuthUser;
  token: string;
}>;

export type User = Readonly<{
  phone: string;
  token: string;
} & Entity>;

export type LatLng = Readonly<{
  lat: number;
  lng: number;
}>;

export enum LocationPermissionLevel {
  NEVER = "never",
  ACTIVE = "active",
  ALWAYS = "always"
}

export type RallyingPoint = Readonly<{
  location: LatLng;
  label: string;
} & Identity>;

export type Liane = Readonly<{
  id?: string;
  createdBy?: Ref<User>;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  departureTime: string;
  /** @format date-time */
  returnTime?: string;
  wayPoints: WayPoint[];
  members: LianeMember[];
  driver?: Ref<User>;
}>;

export type WayPoint = Readonly<{
  rallyingPoint: RallyingPoint;
  duration: number;
}>;

export type LianeMember = Readonly<{
  user: Ref<User>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
}>;

// Seconds since 00:00:00, 0 <= value < 86400 (UTC)
export type TimeOnly = number;

// A date represented by a string in the ISO format : "YYYY-MM-DD"
export type DateOnly = string;

export type TripIntent = Readonly<{
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  goTime: TimeOnly;
  returnTime?: TimeOnly;
} & Entity>;

export type Match = Readonly<{
  user: Ref<User>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
}>;

export type TripIntentMatch = Readonly<{
  tripIntent: TripIntent,
  from: RallyingPoint,
  to: RallyingPoint,
  matches: Match[]
}>;

export type ChatMessage = Readonly<{
  text: string;
} & Entity>;

export type TypedMessage = Readonly<{
  type: "proposal";
} & ChatMessage>;

export type Route = Readonly<{
  coordinates: LatLng[],
  duration: number,
  distance: number,
  delta?: number
}>;
