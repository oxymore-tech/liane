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
  accuracy: number | null;
  speed: number | null;
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
// Is it the right place for that as it might be used among the whole app. ?
export enum LocPermLevel {
  NEVER,
  ACTIVE,
  ALWAYS
}
