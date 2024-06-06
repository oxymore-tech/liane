import { GeolocationLevel, LatLng, Liane, RallyingPoint, Ref, User } from "./api";
import { TimeInSeconds } from "./util";
import { IUnion } from "./union";

export type LianeEvent = JoinRequest | MemberAccepted | MemberRejected | MemberHasLeft | MemberPing;

export type JoinRequest = {
  liane: Ref<Liane>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seats: number;
  takeReturnTrip: boolean;
  message: string;
  geolocationLevel?: GeolocationLevel;
} & IUnion<"JoinRequest">;

export type MemberAccepted = {
  liane: Ref<Liane>;
  member: Ref<User>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seats: number;
  takeReturnTrip: boolean;
} & IUnion<"MemberAccepted">;

export type MemberRejected = {
  liane: Ref<Liane>;
  member: Ref<User>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seats: number;
  takeReturnTrip: boolean;
  reason: string | undefined;
} & IUnion<"MemberRejected">;

export type MemberHasLeft = {
  liane: Ref<Liane>;
} & IUnion<"MemberHasLeft">;

export type MemberPing = {
  liane: Ref<Liane>;
  timestamp: number;
} & (
  | { delay: TimeInSeconds; coordinate?: LatLng }
  | {
      coordinate: LatLng;
      delay?: TimeInSeconds;
    }
) &
  IUnion<"MemberPing">;
