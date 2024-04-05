import { GeolocationLevel, LatLng, Trip, RallyingPoint, Ref, User } from "./api";
import { TimeInSeconds } from "./util";
import { IUnion } from "./union";

export type TripEvent = JoinRequest | MemberAccepted | MemberRejected | MemberHasLeft | MemberPing;

export type JoinRequest = Readonly<
  {
    trip: Ref<Trip>;
    from: Ref<RallyingPoint>;
    to: Ref<RallyingPoint>;
    seats: number;
    takeReturnTrip: boolean;
    message: string;
    geolocationLevel: GeolocationLevel | null;
  } & IUnion<"JoinRequest">
>;

export type MemberAccepted = Readonly<
  {
    trip: Ref<Trip>;
    member: Ref<User>;
    from: Ref<RallyingPoint>;
    to: Ref<RallyingPoint>;
    seats: number;
    takeReturnTrip: boolean;
  } & IUnion<"MemberAccepted">
>;

export type MemberRejected = Readonly<
  {
    trip: Ref<Trip>;
    member: Ref<User>;
    from: Ref<RallyingPoint>;
    to: Ref<RallyingPoint>;
    seats: number;
    takeReturnTrip: boolean;
    reason: string | undefined;
  } & IUnion<"MemberRejected">
>;

export type MemberHasLeft = Readonly<
  {
    trip: Ref<Trip>;
  } & IUnion<"MemberHasLeft">
>;

export type MemberPing = Readonly<
  {
    trip: Ref<Trip>;
    timestamp: number;
  } & (
    | { delay: TimeInSeconds; coordinate?: LatLng }
    | {
        coordinate: LatLng;
        delay?: TimeInSeconds;
      }
  ) &
    IUnion<"MemberPing">
>;
