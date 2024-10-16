import { LatLng, Liane, Ref } from "./api";

export type MemberPing = {
  trip: Ref<Liane>;
  timestamp: number;
  coordinate?: LatLng;
};
