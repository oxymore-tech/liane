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

export interface Address {
  street: string,
  city: string,
  zipCode: string,
  country: string,
  countryCode: string
}

export interface AddressResponse {
  coordinate: LatLng,
  displayName: string,
  address: Address
}

export interface Location {
  coordinate: LatLng;
  address: Address;
}

export interface RealTrip {
  from: Location;
  to: Location;
  startTime: Date;
  endTime: Date;
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
