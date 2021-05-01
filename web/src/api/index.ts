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

export interface RouteStat{coordinates: LatLng[], stat: number}

export enum DayOfWeek {
  Sunday,
  Monday,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday
}

export interface UserLocation {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
}