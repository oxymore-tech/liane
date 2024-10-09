import { LatLng, Liane, RallyingPoint, Ref, User } from "./api";
import { TimeInSeconds } from "./util";
import { IUnion } from "./union";

export type LianeEvent = MemberAccepted | MemberHasLeft | MemberPing;

export type MemberAccepted = {
  liane: Ref<Liane>;
  member: Ref<User>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seats: number;
  takeReturnTrip: boolean;
} & IUnion<"MemberAccepted">;

export type MemberHasLeft = {
  liane: Ref<Liane>;
} & IUnion<"MemberHasLeft">;

export type MemberPing = {
  liane: Ref<Liane>;
  timestamp: number;
  coordinate?: LatLng;
  delay?: TimeInSeconds;
} & IUnion<"MemberPing">;
