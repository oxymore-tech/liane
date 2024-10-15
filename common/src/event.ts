import { LatLng, Liane, Ref } from "./api";
import { TimeInSeconds } from "./util";

export type MemberPing = {
  trip: Ref<Liane>;
  timestamp: number;
  coordinate?: LatLng;
  delay?: TimeInSeconds;
};
