import { LatLng, Trip, Ref } from "./api";

export type MemberPing = {
  trip: Ref<Trip>;
  timestamp: number;
  coordinate?: LatLng;
};
