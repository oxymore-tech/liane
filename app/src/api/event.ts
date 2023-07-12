import { LatLng, Liane, RallyingPoint, Ref, User } from "@/api/index";
import { TimeInSeconds } from "@/util/datetime";

export type LianeEvent = JoinRequest | MemberAccepted | MemberRejected | MemberHasLeft | MemberPing;

export type JoinRequest = Readonly<{
  type: "JoinRequest";
  liane: Ref<Liane>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seats: number;
  takeReturnTrip: boolean;
  message: string;
}>;

export type MemberAccepted = Readonly<{
  type: "MemberAccepted";
  liane: Ref<Liane>;
  member: Ref<User>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seats: number;
  takeReturnTrip: boolean;
}>;

export type MemberRejected = Readonly<{
  type: "MemberRejected";
  liane: Ref<Liane>;
  member: Ref<User>;
  from: Ref<RallyingPoint>;
  to: Ref<RallyingPoint>;
  seats: number;
  takeReturnTrip: boolean;
  reason: string | undefined;
}>;

export type MemberHasLeft = Readonly<{
  type: "MemberHasLeft";
  liane: Ref<Liane>;
}>;

export type MemberPing = Readonly<{
  type: "MemberPing";
  member: Ref<User>;
  liane: Ref<Liane>;
  delay: TimeInSeconds;
  coordinate?: LatLng;
}>;
