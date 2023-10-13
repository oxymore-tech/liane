export type Identity = Readonly<{
  id?: string;
}>;

export type Entity = Readonly<{
  createdBy?: Ref<User>;
  createdAt?: Date;
} & Identity>;

export type Ref<T extends Identity> = string | T;

export type AuthUser = Readonly<{
  id: string;
  phone: string;
  isAdmin: boolean;
}>;

export type AuthResponse = Readonly<{
  user: AuthUser;
  token: string;
}>;

export type User = Readonly<{
  phone: string;
  token: string;
} & Entity>;

export type LatLng = Readonly<{
  lat: number;
  lng: number;
} & Entity>;

export type RallyingPoint = Readonly<{
  location: LatLng;
  label: string;
  isActive: boolean;
} & Identity>;

export type Route = Readonly<{
  coordinates: LatLng[],
  duration: number,
  distance: number,
  delta?: number
}>;
