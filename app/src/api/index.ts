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
} & Entity>;

export enum LocationPermissionLevel {
  NEVER = "never",
  ACTIVE = "active",
  ALWAYS = "always"
}

export type RallyingPoint = Readonly<{
  location: LatLng;
  label: string;
} & Identity>;

export type TimeOnly = Readonly<{
  hour: number;
  minute: number;
}>;

export type TripIntent = Readonly<{
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  goTime: TimeOnly;
  returnTime?: TimeOnly;
} & Entity>;

export type Match = Readonly<{
  user: Ref<User>;
  from: Ref<RallyingPoint>;
  to : Ref<RallyingPoint>;
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
