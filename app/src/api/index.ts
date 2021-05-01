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