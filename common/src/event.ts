import { LatLng, Liane, Ref } from "./api";
import { TimeInSeconds } from "./util";
import { IUnion } from "./union";

export type MemberPing = {
  liane: Ref<Liane>;
  timestamp: number;
  coordinate?: LatLng;
  delay?: TimeInSeconds;
} & IUnion<"MemberPing">;
