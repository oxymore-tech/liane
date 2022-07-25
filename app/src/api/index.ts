export interface AuthUser {
  phone: string,
  token: string
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
  from: RallyingPoint,
  to: RallyingPoint,
  fromTime: string,
  toTime?: string,
}
