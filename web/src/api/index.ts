export interface LatLng { lat: number, lng: number }

export interface RallyingPoint { id: string, position: LatLng, label:string }

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
  foreground?: boolean;
}

export interface RawTrip {
  user: string;
  locations: UserLocation[];
}

export interface AuthUser {
  phone: string;
  token: string;
}

export interface FilterOptions {
  displayRawTrips: boolean;
  displayRallyingPoints: boolean;
  allUsers : boolean ;
  chosenUser?: string ;
  displayBackground: boolean;
  displayForeground: boolean;
  distanceBetweenPoints?: number;
  timeBetweenPoints?: number;
}
