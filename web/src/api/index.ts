export interface LatLng { lat: number, lng: number }

export interface Trip {
  coordinates: RallyingPoint[],
  user? : string,
  time? : number
}

export interface Route {
  readonly coordinates: LatLng[];
  readonly duration: number;
  readonly distance: number;
  readonly delta?: number;
}

export interface RouteStat{
  coordinates: LatLng[];
  stat: number;
}

export enum DayOfWeek {
  Sunday,
  Monday,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday
}

export enum LocationPermissionLevel {
  NEVER = "never",
  ACTIVE = "active",
  ALWAYS = "always",
  NOT_NOW = "not_now"
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

export interface RawTrip {
  user: string;
  locations: UserLocation[];
}

export interface IndexedRawTrip extends RawTrip {
  index: number;
}

export interface AuthUser {
  phone: string;
  token: string;
}

export interface RallyingPoint {
  id: string,
  position: LatLng,
  label: string,
  distance?: number
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

export interface RoutedLiane {
  from: RallyingPoint,
  to: RallyingPoint,
  usages: LianeUsage[],
  route: Route
}

export interface LianeTrip {
  id: string,
  timestamp: number,
  lianes: Liane[]
}

export interface TripFilter {
  center: LatLng,
  from?: RallyingPoint,
  to?: RallyingPoint,
  timestampFrom?: number,
  timestampTo?: number,
  withHour: boolean
}

export interface RoutingQuery {
  start: LatLng ;
  end: LatLng
}