import { IChatMessage } from "react-native-gifted-chat/lib/Models";

export type IIdentity = Readonly<{
  id?: string;
}>;

export type IEntity = Readonly<{
  createdBy?: Ref<User>;
  createdAt?: Date;
} & IIdentity>;

export type Ref<T extends IIdentity> = string | T;

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
} & IEntity>;

export type LatLng = Readonly<{
  lat: number;
  lng: number;
} & IEntity>;

export enum LocationPermissionLevel {
  NEVER = "never",
  ACTIVE = "active",
  ALWAYS = "always"
}

export type RallyingPoint = Readonly<{
  location: LatLng;
  label: string;
} & IIdentity>;

export type TimeOnly = Readonly<{
  hour: number;
  minute: number;
}>;

export type TripIntent = Readonly<{
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  goTime: TimeOnly;
  returnTime?: TimeOnly;
} & IEntity>;

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

export interface ChatMessage extends IChatMessage {
  messageType: "proposal"
}

export interface Route {
  readonly coordinates: LatLng[],
  readonly duration: number,
  readonly distance: number,
  readonly delta?: number
}
