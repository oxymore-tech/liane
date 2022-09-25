import { IChatMessage } from "react-native-gifted-chat/lib/Models";

export type IIdentity = Readonly<{
  id: string;
}>;

export type IEntity = Readonly<{
  createdBy: Ref<User>;
  createdAt: Date;
} & IIdentity>;

export type Ref<T extends IIdentity> = string | T;

export interface AuthUser {
  phone: string,
  token: string,
  id: string
}

export type User = Readonly<{
  phone: string;
  token: string;
} & IEntity>;

export interface Notification {
  date: number;
  message: string;
}

export interface UserLocation {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  permissionLevel?: LocationPermissionLevel;
  isApple?: boolean;
  isForeground?: boolean;
}

export interface LatLng {
  lat: number,
  lng: number
}

// Define the permission level regarding the recuperation of the location
// NEVER : no tracking
// ACTIVE : only when the app. is active
// ALWAYS : always (even on background)
// NOT_NOW : temp. state (will ask again later)
export enum LocationPermissionLevel {
  NEVER = "never",
  ACTIVE = "active",
  ALWAYS = "always",
  NOT_NOW = "not_now"
}

export type RallyingPoint = Readonly<{
  location: LatLng;
  label: string;
} & IIdentity>;

export interface LianeUsage {
  timestamp: number,
  isPrimary: boolean,
  tripId: string
}

export interface Liane {
  from: RallyingPoint,
  to: RallyingPoint,
  usages: LianeUsage[]
}

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

export interface MatchedTripIntent {
  tripIntent: TripIntent,
  p1: RallyingPoint,
  p2: RallyingPoint,
  members: string[]
}

export interface ChatMessage extends IChatMessage {
  messageType: "proposal"
}

export interface Route {
  readonly coordinates: LatLng[],
  readonly duration: number,
  readonly distance: number,
  readonly delta?: number
}

export interface RoutedLiane {
  from: RallyingPoint,
  to: RallyingPoint,
  numberOfUsages: number,
  isPrimary: boolean,
  route: Route
}

export interface TripFilterOptions {
  center: LatLng,
  from?: RallyingPoint,
  to?: RallyingPoint,
  dayFrom?: number,
  dayTo?: number,
  hourFrom?: number,
  hourTo?: number,
  edible?:boolean
}
