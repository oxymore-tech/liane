import { QuickReplies, User } from "react-native-gifted-chat";

export interface AuthUser {
  phone: string,
  token: string,
  uid: string
}

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

export interface RallyingPoint {
  id: string,
  location: LatLng,
  label: string,
}

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

export interface TripIntent {
  id?: string,
  user: string,
  from: RallyingPoint,
  to: RallyingPoint,
  fromTime: Date,
  toTime?: Date,
}

export interface MatchedTripIntent {
  tripIntent: TripIntent,
  p1: RallyingPoint,
  p2: RallyingPoint,
  members: string[]
}

export interface IMessage {
  _id: string | number
  text: string
  createdAt: Date | number
  user: User
  image?: string
  video?: string
  audio?: string
  system?: boolean
  sent?: boolean
  received?: boolean
  pending?: boolean
  quickReplies?: QuickReplies
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
