export interface LatLng {
  lat: number,
  lng: number
}

export interface Trip {
  coordinates: RallyingPoint[],
  user? : string,
  time? : number
}

export interface Route {
  readonly coordinates: LatLng[],
  readonly duration: number,
  readonly distance: number,
  readonly delta?: number
}

export interface RouteStat {
  coordinates: LatLng[],
  stat: number
}

export enum DayOfWeek {
  Sunday = 1,
  Monday = 2,
  Tuesday = 3,
  Wednesday = 4,
  Thursday = 5,
  Friday = 6,
  Saturday = 7
}

export enum LocationPermissionLevel {
  NEVER = "never",
  ACTIVE = "active",
  ALWAYS = "always",
  NOT_NOW = "not_now"
}

export interface UserLocation {
  timestamp: number,
  latitude: number,
  longitude: number,
  accuracy?: number,
  speed?: number,
  permissionLevel?: LocationPermissionLevel,
  isApple?: boolean,
  isForeground?: boolean
}

export interface RawTrip {
  user: string,
  locations: UserLocation[]
}

export interface IndexedRawTrip extends RawTrip {
  index: number
}

export interface AuthUser {
  phone: string,
  token: string
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
  numberOfUsages: number,
  isPrimary: boolean,
  route: Route
}

export interface LianeTrip {
  id: string,
  timestamp: number,
  lianes: Liane[]
}

export interface TripFilterOptions {
  center: LatLng,
  from?: RallyingPoint,
  to?: RallyingPoint,
  dayFrom?: number,
  dayTo?: number,
  hourFrom?: number,
  hourTo?: number
}

export interface RoutingQuery {
  start: LatLng,
  end: LatLng
}

export interface RawTripFilterOptions {
  center: LatLng,
  user?: string,
  timeInterval?: number,
  distInterval?: number,
  withForeground?: boolean,
  withBackGround?: boolean
}

export interface RawTripStats {
  numberOfTrips: number
}

export interface LianeStats {
  numberOfTrips: number,
  numberOfUsers: number
}

export function distance(l1: LatLng, l2: LatLng): number {
  const d1 = l1.lat * (Math.PI / 180.0);
  const num1 = l1.lng * (Math.PI / 180.0);
  const d2 = l2.lat * (Math.PI / 180.0);
  const num2 = l2.lng * (Math.PI / 180.0) - num1;
  const d3 = Math.sin((d2 - d1) / 2.0) ** 2.0
      + Math.cos(d1) * Math.cos(d2) * Math.sin(num2 / 2.0) ** 2.0;
  return 6376500.0 * (2.0 * Math.atan2(Math.sqrt(d3), Math.sqrt(1.0 - d3)));
}

export function toLatLng(ul: UserLocation): LatLng {
  return { lat: ul.latitude, lng: ul.longitude } as LatLng;
}
